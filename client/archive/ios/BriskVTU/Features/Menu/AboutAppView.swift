import SwiftUI

struct AboutAppView: View {
    private var versionString: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "Version \(version) (Build \(build))"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.orange)
                        .padding(.bottom, 8)
                    
                    Text("BriskVTU")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("Maximize your Virtual Top-ups")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    
                    Text(versionString)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 24)
                
                // Content Blocks
                VStack(alignment: .leading, spacing: 16) {
                    Text("We Are Outspoken About Our Success and Position.")
                        .font(.title3)
                        .fontWeight(.semibold)
                    
                    Text("Seamless Transactions, Exceptional Benefits, and Unmatched Convenience—All in One App!\n\nOur app is designed to make your life easier with seamless transactions, unbeatable convenience, and rewards at every step. Whether it’s airtime, data, utility bills, our app has got you covered with top-notch features and support.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                    
                    Divider()
                        .padding(.vertical, 8)
                    
                    Text("Our Core Services")
                        .font(.title3)
                        .fontWeight(.semibold)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        ServiceRow(title: "Airtime & Data Top-Up", description: "Stay connected with seamless airtime and data purchases. Whether it’s for MTN, Glo, Airtel, or 9mobile, BriskVTU ensures quick, secure, and affordable top-ups at competitive rates.")
                        ServiceRow(title: "Electricity Token Purchase", description: "Buying electricity tokens has never been easier. Whether your family or business uses a prepaid or postpaid meter, BriskVTU makes it simple to keep the lights on.")
                        ServiceRow(title: "Cashback and Rewards", description: "Enjoy cashback and rewards on every top-up and bill payment, adding value to your transactions.")
                        ServiceRow(title: "Cable TV Subscriptions", description: "Renew your DSTV, GOTV, or Startimes subscriptions instantly. With BriskVTU, you don’t have to worry about missing your favorite TV shows, sports, or news updates.")
                        ServiceRow(title: "Expense Management", description: "Keep an eye on your spending with detailed transaction history and analytics.")
                        ServiceRow(title: "24/7 Support", description: "Get assistance anytime, anywhere with our dedicated support team available around the clock to help you resolve any issues quickly and efficiently.")
                    }
                    
                    Divider()
                        .padding(.vertical, 8)
                    
                    Text("Special Features")
                        .font(.title3)
                        .fontWeight(.semibold)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        ServiceRow(title: "Coupons", description: "Create and distribute utility coupons to multiple people at once. Perfect for birthdays, anniversaries, or simply helping out family and friends.")
                        ServiceRow(title: "Gifting", description: "BriskVTU Gifting Feature allows users to send airtime, data, or services via gift codes. It ensures flexibility, control, and secure gifting within the app.")
                        ServiceRow(title: "Referral Program", description: "BriskVTU rewards users for spreading the word! You get 5% cashback on their transactions for the first month, and they receive 5% cashback as a welcome bonus!")
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("About App")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct ServiceRow: View {
    let title: String
    let description: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
            Text(description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NavigationStack {
        AboutAppView()
    }
}
