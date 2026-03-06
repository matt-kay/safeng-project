import SwiftUI
import FirebaseAuth

enum AppRoute: Equatable {
    case splash
    case onboarding
    case login
    case verification(verificationID: String, phoneNumber: String)
    case setupProfile
    case main
}

@Observable
class AppState {
    var currentRoute: AppRoute = .splash
    var isLoading: Bool = false
    var errorMessage: String? = nil
    
    var currentUser: User? {
        Auth.auth().currentUser
    }
}
