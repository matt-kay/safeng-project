import Foundation
import FirebaseAuth
import Combine

@MainActor
class UserSessionManager: ObservableObject {
    static let shared = UserSessionManager()
    
    @Published var isAuthenticated: Bool = false
    @Published var currentUserProfile: UserProfile? = nil
    
    private var authStateHandle: AuthStateDidChangeListenerHandle?
    
    private init() {
        // Setup central revocation handler
        Task {
            APIClient.shared.onUnauthorized = { [weak self] in
                self?.handleTokenRevocation()
            }
        }
        
        // Listen to Firebase Auth state changes
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] (_, user) in
            guard let self = self else { return }
            
            if user != nil {
                self.isAuthenticated = true
                // Fetch profile
                Task {
                    await self.syncProfile()
                }
            } else {
                self.isAuthenticated = false
                self.currentUserProfile = nil
                self.clearLocalCache()
            }
        }
    }
    
    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }
    
    private func handleTokenRevocation() {
        print("Token revoked or 401 received. Signing out forcefully.")
        do {
            try Auth.auth().signOut()
            // State listener will catch this and update `isAuthenticated` + clear cache
        } catch {
            print("Failed to sign out on revocation: \(error)")
            // Force state update regardless
            self.isAuthenticated = false
            self.currentUserProfile = nil
            self.clearLocalCache()
        }
    }
    
    func syncProfile() async {
        guard Auth.auth().currentUser != nil else { return }
        
        do {
            let res: BaseResponse<UserProfile> = try await APIClient.shared.request(endpoint: "/me/profile")
            guard let profile = res.data else { return }
            self.currentUserProfile = profile
            self.isAuthenticated = true
            self.cacheProfileLocally(profile: profile)
        } catch APIError.serverError(let statusCode, _) where statusCode == 404 {
            print("Profile not found (404). User needs to setup profile.")
            self.currentUserProfile = nil
            self.isAuthenticated = true
        } catch {
            print("Failed to sync profile: \(error)")
            self.loadProfileFromCache()
        }
    }
    
    func registerProfile(firstName: String, lastName: String, email: String) async throws {
        guard let currentUser = Auth.auth().currentUser else {
            throw APIError.unauthorized
        }
        
        let profileData: [String: String] = [
            "first_name": firstName,
            "last_name": lastName,
            "email": email,
            "phone_number": currentUser.phoneNumber ?? ""
        ]
        
        let body = try? JSONSerialization.data(withJSONObject: profileData)
        
        let res: BaseResponse<UserProfile> = try await APIClient.shared.request(
            endpoint: "/me/profile",
            method: "POST",
            body: body
        )
        
        guard let profile = res.data else { throw APIError.noData }
        self.currentUserProfile = profile
        self.cacheProfileLocally(profile: profile)
    }
    
    func updateProfile(firstName: String, lastName: String, email: String) async throws {
        guard let _ = Auth.auth().currentUser else {
            throw APIError.unauthorized
        }
        
        let profileData: [String: String] = [
            "first_name": firstName,
            "last_name": lastName,
            "email": email
        ]
        
        let body = try? JSONSerialization.data(withJSONObject: profileData)
        
        let res: BaseResponse<UserProfile> = try await APIClient.shared.request(
            endpoint: "/me/profile",
            method: "PATCH",
            body: body
        )
        
        guard let profile = res.data else { throw APIError.noData }
        self.currentUserProfile = profile
        self.cacheProfileLocally(profile: profile)
    }
    
    func updatePhoneNumber(newPhoneNumber: String) async throws {
        guard let _ = Auth.auth().currentUser else {
            throw APIError.unauthorized
        }
        
        let profileData: [String: String] = [
            "phone_number": newPhoneNumber
        ]
        
        let body = try? JSONSerialization.data(withJSONObject: profileData)
        
        let res: BaseResponse<UserProfile> = try await APIClient.shared.request(
            endpoint: "/me/profile",
            method: "PATCH",
            body: body
        )
        
        guard let profile = res.data else { throw APIError.noData }
        self.currentUserProfile = profile
        self.cacheProfileLocally(profile: profile)
    }
    
    private func clearLocalCache() {
        UserDefaults.standard.removeObject(forKey: "cachedUserProfile")
    }
    
    private func cacheProfileLocally(profile: UserProfile) {
        if let data = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(data, forKey: "cachedUserProfile")
        }
    }
    
    private func loadProfileFromCache() {
        if let data = UserDefaults.standard.data(forKey: "cachedUserProfile"),
           let profile = try? JSONDecoder().decode(UserProfile.self, from: data) {
            self.currentUserProfile = profile
        }
    }
}
