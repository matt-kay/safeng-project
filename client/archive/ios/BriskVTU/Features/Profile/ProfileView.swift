import SwiftUI
import FirebaseAuth

struct ProfileView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    @ObservedObject private var sessionManager = UserSessionManager.shared
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .frame(width: 80, height: 80)
                        .foregroundStyle(.orange)
                    
                    Text("\(sessionManager.currentUserProfile?.firstName ?? "") \(sessionManager.currentUserProfile?.lastName ?? "")")
                        .font(.title3)
                        .fontWeight(.bold)
                    
                    Text(sessionManager.currentUserProfile?.email ?? "")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 40)
                
                Spacer()
                
                Button(action: logout) {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Logout")
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(.red)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .navigationTitle("Profile")
        }
    }
    
    private func logout() {
        do {
            try Auth.auth().signOut()
            appState.currentRoute = .login
        } catch {
            print("Logout failed: \(error)")
        }
    }
}

#Preview {
    ProfileView()
        .environment(AppState())
}
