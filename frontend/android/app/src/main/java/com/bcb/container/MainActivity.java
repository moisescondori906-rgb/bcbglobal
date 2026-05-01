package com.bcb.container;

import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.DownloadListener;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

/**
 * MainActivity - Contenedor WebView Profesional
 * Optimizado para rendimiento, seguridad y tamaño mínimo.
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private static final String URL = "https://bcb-global.com";
    private static final String USER_AGENT_SUFFIX = " BCB_APP";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initWebView();
    }

    private void initWebView() {
        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();

        // 1. Rendimiento y Funcionalidad
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // 2. Seguridad Hardening
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);
        
        // 3. Identificación (User-Agent)
        String originalAgent = settings.getUserAgentString();
        settings.setUserAgentString(originalAgent + USER_AGENT_SUFFIX);

        // 4. Navegación y Enlaces Externos
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Permitir navegación interna HTTP/HTTPS
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }

                // Manejar esquemas externos (whatsapp, telegram, tel, mailto, etc)
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return true; // Bloquear si no hay app para manejarlo
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }
        });

        // 5. Gestión de Descargas delegada al sistema
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, 
                                      String mimetype, long contentLength) {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                startActivity(intent);
            }
        });

        webView.loadUrl(URL);
    }

    // 6. Manejo del botón Back
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            if (keyCode == KeyEvent.KEYCODE_BACK) {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
