import SwiftUI

struct SetupProfileView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var emailAddress: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    
    var isFormValid: Bool {
        return !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
               !lastName.trimmingCharacters(in: .whitespaces).isEmpty &&
               emailAddress.contains("@") && emailAddress.contains(".")
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Complete Your Profile")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top, 40)
            
            Text("Tell us a bit about yourself.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            VStack(spacing: 16) {
                TextField("First Name", text: $firstName)
                    .textInputAutocapitalization(.words)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                    .textContentType(.givenName)
                
                TextField("Last Name", text: $lastName)
                    .textInputAutocapitalization(.words)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                    .textContentType(.familyName)
                    
                TextField("Email Address", text: $emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                    .textContentType(.emailAddress)
            }
            .padding(.top, 16)
            
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            
            Spacer()
            
            Button(action: saveProfile) {
                ZStack {
                    if isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Complete Setup")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(isFormValid ? Color.orange : Color.gray.opacity(0.5))
                .foregroundStyle(.white)
                .cornerRadius(12)
            }
            .disabled(!isFormValid || isLoading)
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
        .navigationBarHidden(true)
    }
    
    private func saveProfile() {
        guard isFormValid else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await UserSessionManager.shared.registerProfile(
                    firstName: firstName,
                    lastName: lastName,
                    email: emailAddress
                )
                await MainActor.run {
                    isLoading = false
                    appState.currentRoute = .main
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    self.errorMessage = error.localizedDescription
                    
                    #if DEBUG
                    print(error)
                    #endif
                }
            }
        }
    }
}

#Preview {
    SetupProfileView()
        .environment(AppState())
}
