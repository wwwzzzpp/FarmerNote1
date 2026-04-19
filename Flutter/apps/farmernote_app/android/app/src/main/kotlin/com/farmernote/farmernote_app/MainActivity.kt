package com.farmernote.farmernote_app

import android.content.Context
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugins.GeneratedPluginRegistrant

class MainActivity : FlutterActivity() {
    companion object {
        private const val CHANNEL = "farmernote/startup_consent"
        private const val PREFS = "farmernote_startup"
        private const val CONSENT_KEY = "privacy_consent_v1"
    }

    private var pluginsRegistered = false

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getConsentStatus" -> result.success(hasAcceptedConsent())
                    "acceptConsent" -> {
                        markConsentAccepted()
                        ensurePluginsRegistered(flutterEngine)
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }

        if (hasAcceptedConsent()) {
            ensurePluginsRegistered(flutterEngine)
        }
    }

    private fun hasAcceptedConsent(): Boolean {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(CONSENT_KEY, false)
    }

    private fun markConsentAccepted() {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(CONSENT_KEY, true)
            .apply()
    }

    private fun ensurePluginsRegistered(flutterEngine: FlutterEngine) {
        if (pluginsRegistered) {
            return
        }
        GeneratedPluginRegistrant.registerWith(flutterEngine)
        pluginsRegistered = true
    }
}
