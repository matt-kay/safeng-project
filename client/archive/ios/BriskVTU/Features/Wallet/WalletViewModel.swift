import Foundation
import Combine

@MainActor
final class WalletViewModel: ObservableObject {
    @Published var mainBalance: Double = 0.0
    @Published var cashbackBalance: Double = 0.0
    @Published var cards: [PaymentCardResponse] = []
    
    @Published var isWalletEnabled: Bool = true
    @Published var config: WalletConfigResponse?
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = WalletAPI.shared
    
    func fetchWallet() async {
        isLoading = true
        errorMessage = nil
        do {
            let res = try await api.getWallet()
            self.mainBalance = res.mainBalanceNgn
            self.cashbackBalance = res.cashbackBalanceNgn
            self.isWalletEnabled = true
        } catch {
            self.isWalletEnabled = false
        }
        isLoading = false
    }
    
    func enableWallet() async {
        isLoading = true
        errorMessage = nil
        do {
            let res = try await api.initiateWallet()
            self.mainBalance = res.mainBalanceNgn
            self.cashbackBalance = res.cashbackBalanceNgn
            self.isWalletEnabled = true
        } catch {
            self.errorMessage = "Failed to enable wallet."
            print("Wallet enable error: \(error)")
        }
        isLoading = false
    }
    
    func fetchConfig() async {
        do {
            self.config = try await api.getConfig()
        } catch {
            print("Failed to load wallet config: \(error)")
        }
    }
    
    func fetchCards() async {
        do {
            self.cards = try await api.listCards()
        } catch {
            print("Failed to load cards: \(error)")
        }
    }
    
    func removeCard(cardId: String) async {
        isLoading = true
        do {
            try await api.removeCard(cardId: cardId)
            await fetchCards()
        } catch {
            self.errorMessage = "Failed to remove card."
            print("Remove card error: \(error)")
        }
        isLoading = false
    }
    
    func initiateTopUp(amountUsd: Double, cardId: String?) async throws -> TopUpResponse {
        isLoading = true
        defer { isLoading = false }
        
        do {
            return try await api.initiateTopUp(amountUsd: amountUsd, cardId: cardId)
        } catch {
            self.errorMessage = "Failed to initiate top-up."
            throw error
        }
    }
    
    func getSetupIntentClientSecret() async throws -> String {
        isLoading = true
        defer { isLoading = false }
        let res = try await api.createSetupIntent()
        return res.clientSecret
    }
    
    func attachCard(paymentMethodId: String) async {
        isLoading = true
        do {
            let _ = try await api.attachCard(paymentMethodId: paymentMethodId)
            await fetchCards()
        } catch {
            self.errorMessage = "Failed to attach card."
            print("Attach card error: \(error)")
        }
        isLoading = false
    }
}
