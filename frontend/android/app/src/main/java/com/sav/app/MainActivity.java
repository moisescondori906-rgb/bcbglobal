package com.sav.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.View;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import java.util.Arrays;
import java.util.List;

/**
 * Contenedor Android Enterprise v3.0 - BCB Global.
 * Blindaje total, resiliencia ante red y control de navegación estricto.
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout layoutError;
    private Button btnRetry;
    
    // Configuración Enterprise
    private static final String MAIN_DOMAIN = "bcb-global.com";
    private static final String MAIN_URL = "https://" + MAIN_DOMAIN;
    private static final String APP_IDENTIFIER = "BCB_APP";
    
    // Lista Blanca de Dominios (Whitelist)
    private static final List<String> ALLOWED_DOMAINS = Arrays.asList(
        MAIN_DOMAIN,
        "www.bcb-global.com",
        "api.bcb-global.com",
        "cdn.bcb-global.com",
        "fonts.googleapis.com",
        "fonts.gstatic.com"
    );

    private long backPressedTime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initUI();
        setupWebView();
    }

    private void initUI() {
        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progressBar);
        layoutError = findViewById(R.id.layoutError);
        btnRetry = findViewById(R.id.btnRetry);

        btnRetry.setOnClickListener(v -> {
            if (isNetworkAvailable()) {
                showWebView();
                webView.reload();
            } else {
                Toast.makeText(this, "Aún sin conexión", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        
        // 1. Rendimiento y Smart Cache
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT); // Equilibrio entre velocidad y frescura
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        
        // 2. Seguridad y User-Agent Enterprise
        String originalAgent = settings.getUserAgentString();
        settings.setUserAgentString(originalAgent + " " + APP_IDENTIFIER);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false); // Privacidad

        // 3. WebChromeClient (Barra de Progreso)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        // 4. WebViewClient (Control y Seguridad)
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (!isNetworkAvailable()) {
                    showError();
                } else {
                    showWebView();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showError();
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                // Manejar errores 4xx y 5xx críticos
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
                    showError();
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // Validar SSL Estrictamente para el dominio principal
                if (error.getUrl().contains(MAIN_DOMAIN)) {
                    // Si el error es en el dominio principal, bloqueamos por seguridad
                    // Opcionalmente, mostrar un diálogo de advertencia al usuario
                    handler.cancel();
                    showError();
                    Toast.makeText(MainActivity.this, "Error de seguridad SSL detectado", Toast.LENGTH_LONG).show();
                } else {
                    // Dominios externos sospechosos se bloquean automáticamente
                    handler.cancel();
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String host = Uri.parse(url).getHost();

                // 1. Control de Navegación Interna (Whitelist)
                if (host != null && isDomainAllowed(host)) {
                    return false; // Navegar dentro del WebView
                }

                // 2. Interceptar Servicios Externos (WhatsApp, Telegram, etc.)
                if (isExternalService(url)) {
                    openExternalApp(url);
                    return true;
                }

                // 3. Cualquier otro dominio se abre en el navegador del sistema (Seguridad)
                openInSystemBrowser(url);
                return true;
            }
        });

        // 5. Descargas Enterprise
        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(url));
            startActivity(intent);
            Toast.makeText(this, "Descarga iniciada externamente", Toast.LENGTH_SHORT).show();
        });

        // Carga inicial verificando red
        if (isNetworkAvailable()) {
            webView.loadUrl(MAIN_URL);
        } else {
            showError();
        }
    }

    private boolean isDomainAllowed(String host) {
        for (String allowed : ALLOWED_DOMAINS) {
            if (host.equalsIgnoreCase(allowed) || host.endsWith("." + allowed)) {
                return true;
            }
        }
        return false;
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
    }

    private void showWebView() {
        webView.setVisibility(View.VISIBLE);
        layoutError.setVisibility(View.GONE);
    }

    private void showError() {
        webView.setVisibility(View.GONE);
        layoutError.setVisibility(View.VISIBLE);
    }

    private boolean isExternalService(String url) {
        return url.startsWith("intent://") || url.contains("wa.me") || 
               url.contains("t.me") || url.contains("play.google.com") ||
               url.startsWith("tel:") || url.startsWith("mailto:");
    }

    private void openExternalApp(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "No se encontró aplicación para este enlace", Toast.LENGTH_SHORT).show();
        }
    }

    private void openInSystemBrowser(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            // Error silencioso
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            if (backPressedTime + 2000 > System.currentTimeMillis()) {
                super.onBackPressed();
                return;
            } else {
                Toast.makeText(this, "Presiona atrás de nuevo para salir", Toast.LENGTH_SHORT).show();
            }
            backPressedTime = System.currentTimeMillis();
        }
    }
}
