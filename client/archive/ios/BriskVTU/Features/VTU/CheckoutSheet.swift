import SwiftUI

struct CheckoutSheet: View {
    let serviceName: String
    let identifier: String
    let amount: Double
    let onConfirm: (String) -> Void
    let onDismiss: () -> Void
    
    @State private var pin: String = ""
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Confirm Payment")
                    .font(.title2)
                    .fontWeight(.bold)
                
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Service:")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(serviceName)
                            .fontWeight(.medium)
                    }
                    
                    HStack {
                        Text("To:")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(identifier)
                            .fontWeight(.medium)
                    }
                    
                    HStack {
                        Text("Amount:")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(String(format: "₦%.2f", amount))
                            .fontWeight(.bold)
                    }
                }
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(12)
                
                SecureField("Enter 4-digit PIN", text: $pin)
                    .keyboardType(.numberPad)
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(8)
                    .onChange(of: pin) { newValue in
                        if newValue.count > 4 {
                            pin = String(newValue.prefix(4))
                        }
                    }
                
                Spacer()
                
                Button(action: {
                    onConfirm(pin)
                }) {
                    Text("Pay Now")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(pin.count == 4 ? Color.blue : Color.gray)
                        .cornerRadius(12)
                }
                .disabled(pin.count != 4)
            }
            .padding()
            .navigationBarItems(leading: Button("Cancel") {
                onDismiss()
            })
        }
    }
}
