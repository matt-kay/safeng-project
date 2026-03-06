import SwiftUI
import FirebaseAuth

struct MainTabView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house")
                }
            
            WalletView()
                .tabItem {
                    Label("Wallet", systemImage: "creditcard")
                }
            
            VTUView()
                .tabItem {
                    Label("VTU", systemImage: "antenna.radiowaves.left.and.right")
                }
            
            MenuView(onLogout: {
                do {
                    try Auth.auth().signOut()
                    appState.currentRoute = .login
                } catch {
                    print("Logout failed: \(error)")
                }
            })
            .tabItem {
                Label("Menu", systemImage: "line.3.horizontal")
            }
        }
        .tint(.orange)
    }
}

#Preview {
    MainTabView()
        .environment(AppState())
}
