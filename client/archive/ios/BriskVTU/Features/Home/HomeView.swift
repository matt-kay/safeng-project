import SwiftUI
import FirebaseAuth

struct HomeView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    @ObservedObject private var sessionManager = UserSessionManager.shared
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Hello,")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text(sessionManager.currentUserProfile?.firstName ?? "User")
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                    Spacer()
                    
                }
                .padding(.horizontal)
                
                // Welcome Card
                VStack(alignment: .leading, spacing: 12) {
                    Text("Welcome to BriskVTU")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Top up your airtime and data with ease.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                    
                    Button(action: {}) {
                        Text("Get Started")
                            .fontWeight(.semibold)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(.white)
                            .foregroundStyle(.orange)
                            .cornerRadius(20)
                    }
                    .padding(.top, 8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24)
                .background(
                    LinearGradient(colors: [.orange, .red], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .cornerRadius(20)
                .padding(.horizontal)
                
                Spacer()
            }
            .navigationTitle("BriskVTU")
            .navigationBarTitleDisplayMode(.inline)
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
    HomeView()
        .environment(AppState())
}
