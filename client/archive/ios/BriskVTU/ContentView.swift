//
//  ContentView.swift
//  BriskVTU
//
//  Created by Kayode Matthew on 26/02/2026.
//

import SwiftUI

struct ContentView: View {
    @State private var appState = AppState()
    @AppStorage("themeMode") private var themeMode = 0
    
    var body: some View {
        Group {
            switch appState.currentRoute {
            case .splash:
                SplashView()
            case .onboarding:
                OnboardingView()
            case .login:
                NavigationStack {
                    LoginView()
                }
            case .verification(let verificationID, let phoneNumber):
                NavigationStack {
                    VerificationView(verificationID: verificationID, phoneNumber: phoneNumber)
                }
            case .setupProfile:
                NavigationStack {
                    SetupProfileView()
                }
            case .main:
                MainTabView()
            }
        }
        .environment(appState)
        .animation(.default, value: appState.currentRoute)
        .preferredColorScheme(themeMode == 0 ? nil : (themeMode == 2 ? .dark : .light))
    }
}

#Preview {
    ContentView()
}
