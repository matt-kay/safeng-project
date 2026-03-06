import SwiftUI
import FirebaseAuth

struct SplashView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding: Bool = false
    
    @State private var versionString: String = "v1.0.0"
    
    var body: some View {
        VStack {
            Spacer()
            
            Image(systemName: "bolt.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundStyle(.orange)
            
            Text("BriskVTU")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top, 8)
            
            Text("Fast, Secure & Reliable Top-ups")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            Spacer()
            
            Text(versionString)
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.bottom, 32)
        }
        .onAppear {
            if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
                versionString = "v\(version)"
            }
        }
        .task {
            // Give the splash screen a moment to display for branding
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            
            await MainActor.run {
                if !hasSeenOnboarding {
                    appState.currentRoute = .onboarding
                } else if Auth.auth().currentUser == nil {
                    appState.currentRoute = .login
                } else {
                    // Ideally we should check if they have a profile setup on backend, 
                    // but for this phase we transition to home assuming they do.
                    appState.currentRoute = .main
                }
            }
        }
    }
}

#Preview {
    SplashView()
        .environment(AppState())
}
