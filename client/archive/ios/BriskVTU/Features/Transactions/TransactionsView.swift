import SwiftUI

struct TransactionsView: View {
    @State private var transactions: [Transaction] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading transactions...")
                } else if let error = errorMessage {
                    ContentUnavailableView {
                        Label("Failed to Load", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Retry") {
                            Task { await fetchTransactions() }
                        }
                    }
                } else if transactions.isEmpty {
                    ContentUnavailableView {
                        Label("No Transactions", systemImage: "tray")
                    } description: {
                        Text("You haven't made any transactions yet.")
                    }
                } else {
                    List(transactions) { transaction in
                        NavigationLink(destination: TransactionReceiptView(transaction: transaction)) {
                            TransactionRow(transaction: transaction)
                        }
                    }
                }
            }
            .navigationTitle("Transactions")
            .task {
                await fetchTransactions()
            }
            .refreshable {
                await fetchTransactions()
            }
        }
    }
    
    private func fetchTransactions() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res: BaseResponse<[Transaction]> = try await APIClient.shared.request(endpoint: "/transactions")
            self.transactions = (res.data ?? []).sorted(by: { $0.createdAt > $1.createdAt })
        } catch {
            print("Failed to fetch transactions: \(error)")
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}

struct TransactionRow: View {
    let transaction: Transaction
    
    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor.opacity(0.1))
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: iconName)
                        .foregroundStyle(statusColor)
                }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(transactionTitle)
                    .font(.headline)
                Text(transaction.createdAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            Text(amountPrefix + transaction.formattedAmount)
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(amountColor)
        }
        .padding(.vertical, 4)
    }
    
    private var transactionTitle: String {
        switch transaction.type {
        case .topUp: return "Wallet Top-up"
        case .payment: return transaction.metadata?["service_name"]?.value as? String ?? "Bill Payment"
        case .cashback: return "Cashback Earned"
        case .refund: return "Refund"
        }
    }
    
    private var iconName: String {
        switch transaction.type {
        case .topUp: return "plus.circle"
        case .payment: return "cart"
        case .cashback: return "gift"
        case .refund: return "arrow.counterclockwise"
        }
    }
    
    private var statusColor: Color {
        switch transaction.status {
        case .success: return .green
        case .failed: return .red
        case .pending, .initiated: return .orange
        }
    }
    
    private var amountPrefix: String {
        switch transaction.type {
        case .topUp, .cashback, .refund: return "+"
        case .payment: return "-"
        }
    }
    
    private var amountColor: Color {
        switch transaction.type {
        case .topUp, .cashback, .refund: return .green
        case .payment: return .primary
        }
    }
}

#Preview {
    TransactionsView()
}
