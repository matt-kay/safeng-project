import SwiftUI

struct ProfileEditView: View {
    @SwiftUI.Environment(\.dismiss) private var dismiss
    @ObservedObject private var sessionManager = UserSessionManager.shared
    
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    
    init() {
        _firstName = State(initialValue: UserSessionManager.shared.currentUserProfile?.firstName ?? "")
        _lastName = State(initialValue: UserSessionManager.shared.currentUserProfile?.lastName ?? "")
    }
    
    var isFormValid: Bool {
        return !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
               !lastName.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    var body: some View {
        Form {
            Section("Update Name") {
                TextField("First Name", text: $firstName)
                    .textInputAutocapitalization(.words)
                TextField("Last Name", text: $lastName)
                    .textInputAutocapitalization(.words)
            }
            
            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }
            
            Section {
                Button(action: updateProfile) {
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Save Changes")
                            .frame(maxWidth: .infinity)
                            .fontWeight(.semibold)
                    }
                }
                .disabled(!isFormValid || isLoading)
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func updateProfile() {
        guard isFormValid else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await sessionManager.updateProfile(
                    firstName: firstName,
                    lastName: lastName,
                    email: sessionManager.currentUserProfile?.email ?? ""
                )
                await MainActor.run {
                    isLoading = false
                    dismiss()
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
    NavigationStack {
        ProfileEditView()
    }
}
