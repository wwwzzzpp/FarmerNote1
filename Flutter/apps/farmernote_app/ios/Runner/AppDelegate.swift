import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private let consentChannelName = "farmernote/startup_consent"
  private let consentKey = "privacy_consent_v1"
  private var pluginsRegistered = false

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let didFinish = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(
        name: consentChannelName,
        binaryMessenger: controller.binaryMessenger
      )
      channel.setMethodCallHandler { [weak self] call, result in
        guard let self else {
          result(
            FlutterError(
              code: "consent_unavailable",
              message: "Consent bridge is no longer available.",
              details: nil
            )
          )
          return
        }

        switch call.method {
        case "getConsentStatus":
          result(self.hasAcceptedConsent())
        case "acceptConsent":
          self.markConsentAccepted()
          self.ensurePluginsRegistered()
          result(true)
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }

    if hasAcceptedConsent() {
      ensurePluginsRegistered()
    }

    return didFinish
  }

  private func hasAcceptedConsent() -> Bool {
    return UserDefaults.standard.bool(forKey: consentKey)
  }

  private func markConsentAccepted() {
    UserDefaults.standard.set(true, forKey: consentKey)
  }

  private func ensurePluginsRegistered() {
    guard !pluginsRegistered else {
      return
    }
    GeneratedPluginRegistrant.register(with: self)
    pluginsRegistered = true
  }
}
