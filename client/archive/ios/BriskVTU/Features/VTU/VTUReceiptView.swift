import SwiftUI

struct VTUReceiptView: View {
    let status: String
    let serviceType: String
    let amount: Double
    let referenceId: String
    let createdAt: String
    let onDone: () -> Void
    
    var isSuccess: Bool { status == "SUCCESS" }
    var isPending: Bool { status == "PENDING" }
    
    var iconName: String {
        isSuccess ? "checkmark.circle.fill" : (isPending ? "exclamationmark.circle.fill" : "xmark.circle.fill")
    }
    
    var iconColor: Color {
        isSuccess ? .green : (isPending ? .yellow : .red)
    }
    
    var body: some View {
        VStack(spacing: 32) {
            Image(systemName: iconName)
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundColor(iconColor)
            
            Text("Transaction \(status)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(iconColor)
            
            VStack(spacing: 16) {
                ReceiptRow(label: "Service", value: serviceType)
                ReceiptRow(label: "Amount", value: String(format: "₦%.2f", amount))
                ReceiptRow(label: "Reference ID", value: referenceId)
                ReceiptRow(label: "Date", value: createdAt)
            }
            .padding()
            .background(Color(UIColor.secondarySystemBackground))
            .cornerRadius(12)
            
            if isPending {
                Text("Your transaction is pending provider confirmation. Your wallet will be refunded if it fails.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            Spacer()
            
            Button(action: onDone) {
                Text("Done")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
        }
        .padding()
        .navigationBarBackButtonHidden(true)
    }
}

struct ReceiptRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
    }
}
