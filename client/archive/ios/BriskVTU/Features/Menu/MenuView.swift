import SwiftUI
import FirebaseAuth

struct MenuView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    @SwiftUI.Environment(\.colorScheme) private var colorScheme
    @ObservedObject private var sessionManager = UserSessionManager.shared
    
    @AppStorage("themeMode") private var themeMode = 0
    @AppStorage("isHapticEnabled") private var isHapticEnabled = true
    
    @State private var showingLogoutAlert = false
    
    var onLogout: () -> Void
    
    private var versionString: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "Version \(version) (Build \(build))"
    }
    
    var body: some View {
        NavigationStack {
            List {
                // Section 1: User Profile Card
                Section {
                    HStack(spacing: 16) {
                        AsyncImage(url: URL(string: "https://api.dicebear.com/7.x/avataaars/png?seed=\(sessionManager.currentUserProfile?.uid ?? "default")")) { image in
                            image.resizable()
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(width: 60, height: 60)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.orange.opacity(0.2), lineWidth: 1))
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(sessionManager.currentUserProfile?.firstName ?? "User") \(sessionManager.currentUserProfile?.lastName ?? "")")
                                .font(.headline)
                            Text(sessionManager.currentUserProfile?.phoneNumber ?? "No phone number")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                // Section 2: Account Management
                Section("Account") {
                    NavigationLink(destination: ProfileEditView()) {
                        Label("Update Profile", systemImage: "person.text.rectangle")
                    }
                    NavigationLink(destination: ChangePhoneNumberView()) {
                        Label("Change Phone Number", systemImage: "phone.badge.plus")
                    }
                    NavigationLink(destination: BeneficiariesView()) {
                        Label("Beneficiaries", systemImage: "person.2")
                    }
                    NavigationLink(destination: TransactionsView()) {
                        Label("Transactions", systemImage: "list.bullet.rectangle")
                    }
                    NavigationLink(destination: CouponsView()) {
                        Label("Coupons", systemImage: "tag")
                    }
                }
                
                // Section 3: App Settings
                Section("Settings") {
                    Toggle(isOn: Binding(
                        get: { themeMode == 0 ? colorScheme == .dark : themeMode == 2 },
                        set: { newValue in
                            themeMode = newValue ? 2 : 1
                            HapticManager.shared.playImpact()
                        }
                    )) {
                        Label("Dark Mode", systemImage: "moon.fill")
                    }
                    
                    Toggle(isOn: $isHapticEnabled) {
                        Label("Haptic Feedback", systemImage: "waveform.path.ecg")
                    }
                    .onChange(of: isHapticEnabled) { _, _ in
                        HapticManager.shared.playImpact()
                    }
                }
                
                // Section 4: Support & Information
                Section("Support") {
                    NavigationLink(destination: AboutAppView()) {
                        Label("About App", systemImage: "info.circle")
                    }
                    NavigationLink(destination: ContactUsView()) {
                        Label("Contact Us", systemImage: "envelope")
                    }
                }
                
                Section {
                    Button(role: .destructive, action: { showingLogoutAlert = true }) {
                        Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
                
                Section {
                    Text(versionString)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Menu")
            .alert("Logout", isPresented: $showingLogoutAlert) {
                Button("Logout", role: .destructive, action: onLogout)
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to log out?")
            }
        }
    }
}

#Preview {
    MenuView(onLogout: {})
        .environment(AppState())
}
