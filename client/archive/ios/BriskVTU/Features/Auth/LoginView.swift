import SwiftUI
import FirebaseAuth

struct LoginView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    
    @State private var phoneNumber: String = ""
    @State private var selectedCountryCode: String = "+1"
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    
    let countryCodes = ["+1", "+44", "+234", "+91", "+27", "+254"] // Basic mock list
    
    //test phonenumber - +1 6505554567
    
    var fullPhoneNumber: String {
        return "\(selectedCountryCode)\(phoneNumber)"
    }
    
    var isPhoneNumberValid: Bool {
        return phoneNumber.count >= 7
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Welcome to BriskVTU")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top, 40)
            
            Text("Enter your phone number to continue")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            HStack {
                Picker("Country Code", selection: $selectedCountryCode) {
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
            .padding(.top, 16)
            
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            
            Spacer()
            
            Button(action: sendVerificationCode) {
                ZStack {
                    if isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Send Code")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(isPhoneNumberValid ? Color.orange : Color.gray.opacity(0.5))
                .foregroundStyle(.white)
                .cornerRadius(12)
            }
            .disabled(!isPhoneNumberValid || isLoading)
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
        .navigationBarHidden(true)
    }
    
    private func sendVerificationCode() {
        isLoading = true
        errorMessage = nil
        
        PhoneAuthProvider.provider().verifyPhoneNumber(fullPhoneNumber, uiDelegate: nil) { verificationID, error in
            DispatchQueue.main.async {
                isLoading = false
                if let error = error {
                    self.errorMessage = error.localizedDescription
                } else if let verificationID = verificationID {
                    appState.currentRoute = .verification(verificationID: verificationID, phoneNumber: fullPhoneNumber)
                }
            }
        }
    }
}

#Preview {
    LoginView()
        .environment(AppState())
}
