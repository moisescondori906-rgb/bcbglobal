package com.sav.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.DownloadListener;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Contenedor Android Profesional para BCB Global.
 * Arquitectura basada en WebView optimizada para producción.
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;
    // URL Principal Configurable
    private static final String MAIN_URL = "https://bcb-global.com"; // Cambiar por tu dominio real
    // Identificador único para detección desde la web
    private static final String APP_IDENTIFIER = "BCB_APP";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initWebView();
    }

    private void initWebView() {
        webView = findViewById(R.id.webview);
        
        WebSettings settings = webView.getSettings();
        
        // 1. Configuraciones Core
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // 2. Detección de APP (User-Agent)
        String originalAgent = settings.getUserAgentString();
        settings.setUserAgentString(originalAgent + " " + APP_IDENTIFIER);

        // 3. WebViewClient para navegación interna y manejo de enlaces externos
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Interceptar enlaces externos
                if (isExternalUrl(url)) {
                    openExternalApp(url);
                    return true;
                }
                
                // Navegación interna
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });

        // 4. Manejo de Descargas
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setData(Uri.parse(url));
                startActivity(i);
            }
        });

        // 5. Carga de URL Inicial
        webView.loadUrl(MAIN_URL);
    }

    /**
     * Detecta si una URL debe abrirse fuera de la aplicación.
     */
    private boolean isExternalUrl(String url) {
        return url.contains("play.google.com") || 
               url.startsWith("intent://") || 
               url.contains("wa.me") || 
               url.contains("t.me") || 
               url.startsWith("tel:") || 
               url.startsWith("mailto:");
    }

    /**
     * Abre una aplicación externa mediante Intent.
     */
    private void openExternalApp(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            // Manejo silencioso de errores en caso de que la app externa no esté instalada
        }
    }

    /**
     * Control del botón Back nativo.
     */
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
