import SwiftUI
import FirebaseAuth

struct VerificationView: View {
    let verificationID: String
    let phoneNumber: String
    
    @SwiftUI.Environment(AppState.self) private var appState
    
    @State private var otpCode: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    
    var isCodeComplete: Bool {
        return otpCode.count == 6
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Verify Phone Number")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top, 40)
            
            Text("Enter the 6-digit code sent to \(phoneNumber)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            TextField("000000", text: $otpCode)
                .keyboardType(.numberPad)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .tracking(8)
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
                .padding(.vertical, 16)
            
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            
            Button(action: {
                appState.currentRoute = .login
            }) {
                Text("Change Phone Number")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
            }
            
            Spacer()
            
            Button(action: verifyCode) {
                ZStack {
                    if isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Verify Code")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(isCodeComplete ? Color.orange : Color.gray.opacity(0.5))
                .foregroundStyle(.white)
                .cornerRadius(12)
            }
            .disabled(!isCodeComplete || isLoading)
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
        .navigationBarHidden(true)
    }
    
    private func verifyCode() {
        guard isCodeComplete else { return }
        
        isLoading = true
        errorMessage = nil
        
        let credential = PhoneAuthProvider.provider().credential(
            withVerificationID: verificationID,
            verificationCode: otpCode
        )
        
        Auth.auth().signIn(with: credential) { authResult, error in
            Task {
                if let error = error {
                    await MainActor.run {
                        self.isLoading = false
                        self.errorMessage = error.localizedDescription
                        #if DEBUG
                        print(error.localizedDescription)
                        #endif
                        
                    }
                } else {
                    // Sync profile with backend
                    await UserSessionManager.shared.syncProfile()
                    
                    await MainActor.run {
                        self.isLoading = false
                        if UserSessionManager.shared.currentUserProfile != nil {
                            appState.currentRoute = .main
                        } else {
                            appState.currentRoute = .setupProfile
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    VerificationView(verificationID: "dummy", phoneNumber: "+234 800 000 0000")
        .environment(AppState())
}
