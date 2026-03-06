import SwiftUI
import FirebaseAuth

struct ChangePhoneNumberView: View {
    @SwiftUI.Environment(\.dismiss) private var dismiss
    @SwiftUI.Environment(AppState.self) private var appState
    @ObservedObject private var sessionManager = UserSessionManager.shared
    
    @State private var phoneNumber: String = ""
    @State private var selectedCountryCode: String = "+234"
    @State private var otpCode: String = ""
    @State private var verificationID: String? = nil
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    @State private var step: ChangeStep = .enterPhone
    
    enum ChangeStep {
        case enterPhone
        case enterOTP
    }
    
    let countryCodes = ["+1", "+44", "+234", "+91", "+27", "+254"]
    
    var fullPhoneNumber: String {
        return "\(selectedCountryCode)\(phoneNumber)"
    }
    
    var isPhoneNumberValid: Bool {
        return phoneNumber.count >= 7
    }
    
    var isCodeComplete: Bool {
        return otpCode.count == 6
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if step == .enterPhone {
                enterPhoneSection
            } else {
                enterOTPSection
            }
            
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.top, 8)
            }
            
            Spacer()
            
            actionButton
        }
        .padding(.horizontal, 24)
        .navigationTitle("Change Phone Number")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private var enterPhoneSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Enter your new phone number")
                .font(.headline)
            
            Text("We will send a verification code to this number to confirm the change.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            HStack {
                Picker("Code", selection: $selectedCountryCode) {
                    ForEach(countryCodes, id: \.self) { code in
                        Text(code).tag(code)
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .frame(maxWidth: 90)
                .padding(.vertical, 8)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
                
                TextField("Phone Number", text: $phoneNumber)
                    .keyboardType(.numberPad)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
            }
        }
        .padding(.top, 20)
    }
    
    private var enterOTPSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Verify New Number")
                .font(.headline)
            
            Text("Enter the 6-digit code sent to \(fullPhoneNumber)")
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
            
            Button("Back to phone number") {
                step = .enterPhone
                otpCode = ""
            }
            .font(.subheadline)
            .foregroundStyle(.orange)
        }
        .padding(.top, 20)
    }
    
    private var actionButton: some View {
        Button(action: step == .enterPhone ? sendVerificationCode : verifyCode) {
            ZStack {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text(step == .enterPhone ? "Send Verification Code" : "Update Phone Number")
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isButtonEnabled ? Color.orange : Color.gray.opacity(0.5))
            .foregroundStyle(.white)
            .cornerRadius(12)
        }
        .disabled(!isButtonEnabled || isLoading)
        .padding(.bottom, 24)
    }
    
    private var isButtonEnabled: Bool {
        step == .enterPhone ? isPhoneNumberValid : isCodeComplete
    }
    
    private func sendVerificationCode() {
        isLoading = true
        errorMessage = nil
        
        PhoneAuthProvider.provider().verifyPhoneNumber(fullPhoneNumber, uiDelegate: nil) { vID, error in
            DispatchQueue.main.async {
                isLoading = false
                if let error = error {
                    self.errorMessage = error.localizedDescription
                } else {
                    self.verificationID = vID
                    self.step = .enterOTP
                }
            }
        }
    }
    
    private func verifyCode() {
        guard let vID = verificationID else { return }
        isLoading = true
        errorMessage = nil
        
        let credential = PhoneAuthProvider.provider().credential(
            withVerificationID: vID,
            verificationCode: otpCode
        )
        
        Auth.auth().currentUser?.updatePhoneNumber(credential) { error in
            Task {
                if let error = error {
                    await MainActor.run {
                        self.isLoading = false
                        self.errorMessage = error.localizedDescription
                    }
                } else {
                    // Sync with backend
                    do {
                        try await sessionManager.updatePhoneNumber(newPhoneNumber: fullPhoneNumber)
                        await MainActor.run {
                            self.isLoading = false
                            dismiss()
                        }
                    } catch {
                        await MainActor.run {
                            self.isLoading = false
                            self.errorMessage = "Phone updated in Auth but failed to sync profile: \(error.localizedDescription)"
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        ChangePhoneNumberView()
            .environment(AppState())
    }
}
