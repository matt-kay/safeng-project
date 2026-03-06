import SwiftUI

struct TransactionReceiptView: View {
    let transaction: Transaction
    @SwiftUI.Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header with Status Icon
                VStack(spacing: 12) {
                    Circle()
                        .fill(statusColor.opacity(0.1))
                        .frame(width: 80, height: 80)
                        .overlay {
                            Image(systemName: iconName)
                                .font(.system(size: 32, weight: .bold))
                                .foregroundStyle(statusColor)
                        }
                    
                    Text(transaction.status.rawValue)
                        .font(.headline)
                        .foregroundStyle(statusColor)
                    
                    Text(transaction.formattedAmount)
                        .font(.system(size: 36, weight: .bold))
                }
                .padding(.top, 20)
                
                // Transaction Details Card
                VStack(spacing: 16) {
                    DetailRow(label: "Transaction Type", value: transactionTypeString)
                    DetailRow(label: "Reference", value: transaction.id)
                    DetailRow(label: "Date", value: transaction.createdAt.formatted(date: .long, time: .shortened))
                    
                    if let serviceName = transaction.metadata?["service_name"]?.value as? String {
                        DetailRow(label: "Service", value: serviceName)
                    }
                    
                    if let beneficiary = transaction.metadata?["beneficiary"]?.value as? String {
                        DetailRow(label: "Beneficiary", value: beneficiary)
                    }
                    
                    Divider()
                    
                    DetailRow(label: "Amount", value: transaction.formattedAmount)
                    DetailRow(label: "Service Fee", value: formattedFee)
                    
                    Divider()
                    
                    DetailRow(label: "Total", value: transaction.formattedAmount, isBold: true)
                }
                .padding()
                .background(Color(uiColor: .secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
                
                // Metadata Section (if any extra info exists)
                if hasExtraMetadata {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Additional Info")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        VStack(spacing: 12) {
                            ForEach(filteredMetadataKeys, id: \.self) { key in
                                DetailRow(label: key.replacingOccurrences(of: "_", with: " ").capitalized,
                                          value: "\(transaction.metadata?[key]?.value ?? "")")
                            }
                        }
                        .padding()
                        .background(Color(uiColor: .secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
                
                Spacer(minLength: 40)
                
                // Actions
                Button(action: {
                    // Share receipt logic could go here
                }) {
                    Label("Share Receipt", systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal)
            }
            .padding()
        }
        .navigationTitle("Transaction Details")
        .navigationBarTitleDisplayMode(.inline)
        .background(Color(uiColor: .systemGroupedBackground))
    }
    
    // MARK: - Helpers
    
    private var transactionTypeString: String {
        switch transaction.type {
        case .topUp: return "Wallet Top-up"
        case .payment: return "Bill Payment"
        case .cashback: return "Cashback"
        case .refund: return "Refund"
        }
    }
    
    private var iconName: String {
        switch transaction.status {
        case .success: return "checkmark.circle.fill"
        case .failed: return "xmark.circle.fill"
        case .pending, .initiated: return "clock.fill"
        }
    }
    
    private var statusColor: Color {
        switch transaction.status {
        case .success: return .green
        case .failed: return .red
        case .pending, .initiated: return .orange
        }
    }
    
    private var formattedFee: String {
        let feeInNaira = Double(transaction.serviceFee) / 100.0
        return "₦\(String(format: "%.2f", feeInNaira))"
    }
    
    private var hasExtraMetadata: Bool {
        !filteredMetadataKeys.isEmpty
    }
    
    private var filteredMetadataKeys: [String] {
        guard let metadata = transaction.metadata else { return [] }
        let excludedKeys = ["service_name", "beneficiary", "user_id", "wallet_id"]
        return metadata.keys.filter { !excludedKeys.contains($0) }.sorted()
    }
}

struct DetailRow: View {
    let label: String
    let value: String
    var isBold: Bool = false
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(isBold ? .bold : .regular)
                .multilineTextAlignment(.trailing)
        }
    }
}

#Preview {
    // Mock Transaction for preview
    NavigationStack {
        TransactionReceiptView(transaction: Transaction(
            id: "TRX-123456",
            walletId: "W-789",
            userId: "U-456",
            type: .payment,
            amount: 500000, // 5000 NGN
            serviceFee: 10000, // 100 NGN
            currency: "NGN",
            status: .success,
            exchangeRate: 1.0,
            failureReason: nil,
            metadata: ["service_name": AnyCodable("MTN Airtime"), "beneficiary": AnyCodable("08012345678")],
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}
