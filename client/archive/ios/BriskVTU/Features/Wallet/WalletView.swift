import SwiftUI
#if canImport(StripePaymentSheet)
import StripePaymentSheet
#endif

struct WalletView: View {
    @StateObject private var viewModel = WalletViewModel()
    @State private var showingTopUpSheet = false
    
    #if canImport(StripePaymentSheet)
    @State private var paymentSheet: PaymentSheet?
    @State private var paymentResult: PaymentSheetResult?
    #endif
    
    var body: some View {
        NavigationStack {
            Group {
                if !viewModel.isWalletEnabled && !viewModel.isLoading {
                    enableWalletView
                } else {
                    walletDashboard
                }
            }
            .navigationTitle("My Wallet")
            .onAppear {
                Task {
                    await viewModel.fetchWallet()
                    await viewModel.fetchCards()
                    await viewModel.fetchConfig()
                }
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView()
                        .padding()
                        .background(Color(.systemBackground).opacity(0.8))
                        .cornerRadius(8)
                }
            }
            .alert(isPresented: .constant(viewModel.errorMessage != nil)) {
                Alert(
                    title: Text("Error"),
                    message: Text(viewModel.errorMessage ?? ""),
                    dismissButton: .default(Text("OK")) {
                        viewModel.errorMessage = nil
                    }
                )
            }
            .sheet(isPresented: $showingTopUpSheet) {
                if #available(iOS 16.0, *) {
                    TopUpSheet(
                        config: viewModel.config,
                        onProceed: { amountUsd in
                            showingTopUpSheet = false
                            initiateStripeTopUp(amount: amountUsd)
                        }
                    )
                    .presentationDetents([PresentationDetent.medium, PresentationDetent.large])
                } else {
                    TopUpSheet(
                        config: viewModel.config,
                        onProceed: { amountUsd in
                            showingTopUpSheet = false
                            initiateStripeTopUp(amount: amountUsd)
                        }
                    )
                }
            }
            #if canImport(StripePaymentSheet)
            .paymentSheet(isPresented: .init(
                get: { paymentSheet != nil },
                set: { if !$0 { paymentSheet = nil } }
            ), paymentSheet: paymentSheet ?? PaymentSheet(paymentIntentClientSecret: "", configuration: .init()), onCompletion: { result in
                switch result {
                case .completed:
                    Task { await viewModel.fetchWallet() }
                    print("Payment completed")
                case .failed(let error):
                    viewModel.errorMessage = "Payment failed: \(error.localizedDescription)"
                case .canceled:
                    print("Payment canceled.")
                }
                self.paymentSheet = nil
            })
            #endif
        }
    }
    
    private var enableWalletView: some View {
        VStack(spacing: 20) {
            Image(systemName: "wallet.pass")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            Text("Activate Your Wallet")
                .font(.title2)
                .fontWeight(.bold)
            Text("Enable your BriskVTU wallet to start making quick transactions and earning cashback.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)
            
            Button(action: {
                Task { await viewModel.enableWallet() }
            }) {
                Text("Enable Wallet")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 32)
            .padding(.top, 20)
        }
    }
    
    private var walletDashboard: some View {
        ScrollView {
            VStack(spacing: 24) {
                balanceCard
                actionButtons
                cardsSection
            }
            .padding()
        }
    }
    
    private func initiateStripeTopUp(amount: Double) {
        Task {
            do {
                let response = try await viewModel.initiateTopUp(amountUsd: amount, cardId: nil)
                #if canImport(StripePaymentSheet)
                var configuration = PaymentSheet.Configuration()
                configuration.merchantDisplayName = "BriskVTU Wallet"
                
                self.paymentSheet = PaymentSheet(
                    paymentIntentClientSecret: response.clientSecret,
                    configuration: configuration
                )
                #else
                viewModel.errorMessage = "Stripe SDK not integrated. Top up initiated on server."
                #endif
            } catch {
                print("Top up error: \(error)")
            }
        }
    }
    
    // MARK: - Subviews
    private var balanceCard: some View {
        VStack(spacing: 16) {
            VStack {
                Text("Main Balance")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                Text(String(format: "₦%.2f", viewModel.mainBalance))
                    .font(.system(size: 36, weight: .bold))
            }
            
            Divider()
            
            HStack {
                Text("Cashback Balance")
                    .foregroundStyle(.secondary)
                Spacer()
                Text(String(format: "₦%.2f", viewModel.cashbackBalance))
                    .fontWeight(.semibold)
                    .foregroundStyle(.green)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
    
    private var actionButtons: some View {
        Button(action: {
            showingTopUpSheet = true
        }) {
            HStack {
                Image(systemName: "plus.circle.fill")
                Text("Fund Wallet")
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .cornerRadius(12)
        }
    }
    
    private var cardsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Saved Cards")
                    .font(.headline)
                Spacer()
                if viewModel.cards.count < 2 {
                    Button("Add Card") {
                        // Trigger add card Stripe setup intent flow
                    }
                    .font(.subheadline)
                }
            }
            
            if viewModel.cards.isEmpty {
                Text("No saved cards. Add a card for quick top-ups.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.cards) { card in
                    HStack {
                        Image(systemName: "creditcard.fill")
                            .foregroundStyle(.blue)
                        VStack(alignment: .leading) {
                            Text("\(card.brand) •••• \(card.last4)")
                                .fontWeight(.medium)
                            Text("Exp: \(card.expMonth)/\(card.expYear)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button(action: {
                            Task { await viewModel.removeCard(cardId: card.id) }
                        }) {
                            Image(systemName: "trash")
                                .foregroundStyle(.red)
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                }
            }
        }
    }
}

// MARK: - Top Up Sheet
struct TopUpSheet: View {
    @SwiftUI.Environment(\.dismiss) var dismiss
    let config: WalletConfigResponse?
    let onProceed: (Double) -> Void
    
    @State private var amountText: String = ""
    let presetAmounts: [Double] = [10, 20, 50, 100]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Fund Wallet")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Select or enter the amount in USD ($) you want to pay.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    // Presets
                    HStack {
                        ForEach(presetAmounts, id: \.self) { amount in
                            Button(action: {
                                amountText = String(format: "%.0f", amount)
                            }) {
                                Text("$\(Int(amount))")
                                    .fontWeight(.medium)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(Double(amountText) == amount ? Color.blue : Color(.systemGray5))
                                    .foregroundColor(Double(amountText) == amount ? .white : .primary)
                                    .cornerRadius(8)
                            }
                        }
                    }
                    
                    // Custom Input
                    TextField("Enter Amount (USD)", text: $amountText)
                        .keyboardType(.decimalPad)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    
                    // Breakdown Details
                    if let usd = Double(amountText), usd > 0, let conf = config {
                        let totalNgnContent = usd * conf.exchangeRate
                        let feeMultiplier = conf.topUpFeePercentage / 100
                        let amountNgn = totalNgnContent / (1 + feeMultiplier)
                        let feeNgn = totalNgnContent - amountNgn
                        
                        VStack(spacing: 12) {
                            breakdownRow(title: "You will pay:", value: String(format: "$%.2f", usd))
                            breakdownRow(title: "Exchange Rate:", value: "$1 = ₦\(Int(conf.exchangeRate))")
                            breakdownRow(title: "Service Fee (\(String(format: "%.1f", conf.topUpFeePercentage))%):", value: String(format: "₦%.2f", feeNgn))
                            Divider()
                            breakdownRow(title: "You will receive:", value: String(format: "₦%.2f", amountNgn), isBold: true, valueColor: .green)
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                    } else if config == nil {
                        Text("Loading exchange rate...")
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        if let usd = Double(amountText), usd > 0 {
                            onProceed(usd)
                        }
                    }) {
                        Text("Proceed")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Double(amountText ?? "0") ?? 0 > 0 ? Color.blue : Color.gray)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    .disabled((Double(amountText) ?? 0) <= 0)
                }
                .padding()
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
    
    private func breakdownRow(title: String, value: String, isBold: Bool = false, valueColor: Color = .primary) -> some View {
        HStack {
            Text(title)
                .foregroundColor(.secondary)
                .font(isBold ? .headline : .subheadline)
            Spacer()
            Text(value)
                .fontWeight(isBold ? .bold : .medium)
                .foregroundColor(valueColor)
        }
    }
}

#Preview {
    WalletView()
}
