# Reglas de Proguard para Contenedor WebView Profesional

# Mantener WebView y clases relacionadas
-keep class android.webkit.** { *; }
-dontwarn android.webkit.**

# Optimización de tamaño
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# Mantener clases necesarias de AndroidX
-keep class androidx.appcompat.** { *; }
-keep class com.google.android.material.** { *; }

# Eliminar logs de producción para rendimiento y seguridad
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}
