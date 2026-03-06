//
//  BriskVTUApp.swift
//  BriskVTU
//
//  Created by Kayode Matthew on 26/02/2026.
//

import SwiftUI
import FirebaseCore
import FirebaseAuth

class AppDelegate: NSObject, UIApplicationDelegate {
  func application(_ application: UIApplication,
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    FirebaseApp.configure()
#if DEBUG
    // Connect to the Firebase Auth emulator
    Auth.auth().useEmulator(withHost: "127.0.0.1", port: 9099)
    // Disable app verification for testing with fictional phone numbers
    Auth.auth().settings?.isAppVerificationDisabledForTesting = true
#endif
    return true
  }

  // Required for Phone Auth to handle the silent push notification/reCAPTCHA flow
  func application(_ application: UIApplication,
                   didReceiveRemoteNotification userInfo: [AnyHashable : Any],
                   fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    if Auth.auth().canHandleNotification(userInfo) {
      completionHandler(.noData)
      return
    }
    // This notification is not for Auth, handle it normally
    completionHandler(.noData)
  }
}

@main
struct YourApp: App {
  // register app delegate for Firebase setup
  @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}
