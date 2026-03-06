import SwiftUI

struct CouponsView: View {
    @StateObject private var viewModel = CouponViewModel()
    @State private var selectedTab = 0
    @State private var showCreateSheet = false
    @State private var redeemCode = ""
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Coupon Type", selection: $selectedTab) {
                    Text("Redeem").tag(0)
                    Text("My Coupons").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()
                .background(Color(uiColor: .systemGroupedBackground))
                
                if selectedTab == 0 {
                    RedeemTab(redeemCode: $redeemCode, viewModel: viewModel)
                } else {
                    MyCouponsTab(viewModel: viewModel)
                }
            }
            .navigationTitle("Coupons")
            .toolbar {
                if selectedTab == 1 {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showCreateSheet = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .symbolRenderingMode(.hierarchical)
                                .font(.title2)
                        }
                    }
                }
            }
            .sheet(isPresented: $showCreateSheet) {
                CreateCouponView(viewModel: viewModel)
            }
            .alert("Success", isPresented: Binding(
                get: { viewModel.successMessage != nil },
                set: { if !$0 { viewModel.clearMessages() } }
            )) {
                Button("OK", role: .cancel) { }
            } message: {
                if let msg = viewModel.successMessage {
                    Text(msg)
                }
            }
            .alert("Error", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.clearMessages() } }
            )) {
                Button("OK", role: .cancel) { }
            } message: {
                if let msg = viewModel.errorMessage {
                    Text(msg)
                }
            }
            .onAppear {
                Task { await viewModel.fetchMyCoupons() }
            }
        }
    }
}

struct RedeemTab: View {
    @Binding var redeemCode: String
    @ObservedObject var viewModel: CouponViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 16) {
                    Image(systemName: "ticket.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.tint)
                        .padding(.top, 40)
                    
                    Text("Redeem Your Coupon")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Enter the code below to credit your wallet instantly.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                
                VStack(spacing: 20) {
                    TextField("Enter Code (e.g. BRISK-XXXX)", text: $redeemCode)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .multilineTextAlignment(.center)
                        .padding()
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                    
                    Button {
                        Task { await viewModel.redeemCoupon(code: redeemCode) }
                    } label: {
                        HStack {
                            if viewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Redeem Coupon")
                                    .fontWeight(.bold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(redeemCode.isEmpty ? Color.gray : Color.blue)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(redeemCode.isEmpty || viewModel.isLoading)
                }
                .padding(.horizontal)
                
                Spacer()
            }
        }
    }
}

struct MyCouponsTab: View {
    @ObservedObject var viewModel: CouponViewModel
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.myCoupons.isEmpty {
                ProgressView("Loading...")
            } else if viewModel.myCoupons.isEmpty {
                ContentUnavailableView {
                    Label("No Coupons Created", systemImage: "tag")
                } description: {
                    Text("You haven't created any coupons yet. Share your rewards with others by creating one!")
                }
            } else {
                List(viewModel.myCoupons) { coupon in
                    CouponRow(coupon: coupon, viewModel: viewModel)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.fetchMyCoupons()
                }
            }
        }
    }
}

struct CouponRow: View {
    let coupon: CouponResponse
    @ObservedObject var viewModel: CouponViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(coupon.name)
                        .font(.headline)
                    Text(coupon.code)
                        .font(.subheadline)
                        .monospaced()
                        .foregroundStyle(.tint)
                        .fontWeight(.bold)
                }
                
                Spacer()
                
                StatusBadge(status: coupon.status)
            }
            
            HStack {
                Label("₦\(coupon.amountPerUse)", systemImage: "banknote")
                Spacer()
                Label("\(coupon.remainingUses)/\(coupon.maxUses)", systemImage: "person.2")
                Spacer()
                Label(expiryText, systemImage: "calendar")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            
            HStack {
                Spacer()
                if coupon.status == "ACTIVE" {
                    ShareLink(item: "Here's a gift for you! Use coupon code \(coupon.code) on BriskVTU to claim your reward.") {
                        Label("Share", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.bordered)
                    .tint(.blue)
                    .controlSize(.small)
                    
                    Button("Pause") { Task { await viewModel.pauseCoupon(id: coupon.id) } }
                        .buttonStyle(.bordered)
                        .tint(.orange)
                } else if coupon.status == "PAUSED" {
                    Button("Resume") { Task { await viewModel.resumeCoupon(id: coupon.id) } }
                        .buttonStyle(.bordered)
                        .tint(.green)
                }
                
                if coupon.status != "REVOKED" && coupon.status != "EXPIRED" {
                    Button("Revoke") { Task { await viewModel.revokeCoupon(id: coupon.id) } }
                        .buttonStyle(.bordered)
                        .tint(.red)
                }
            }
            .controlSize(.small)
        }
        .padding()
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
    
    private var expiryText: String {
        guard let date = coupon.expiresAt else { return "Never" }
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}

struct StatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status)
            .font(.caption2)
            .fontWeight(.bold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.1))
            .foregroundStyle(statusColor)
            .clipShape(Capsule())
    }
    
    private var statusColor: Color {
        switch status {
        case "ACTIVE": return .green
        case "PAUSED": return .orange
        case "REVOKED": return .red
        case "EXPIRED": return .gray
        default: return .blue
        }
    }
}

struct CreateCouponView: View {
    @SwiftUI.Environment(\.dismiss) var dismiss
    @ObservedObject var viewModel: CouponViewModel
    @State private var amount = ""
    @State private var maxUses = ""
    @State private var name = ""
    @State private var expiryDate = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    TextField("Coupon Name (Optional)", text: $name)
                    TextField("Amount per Redemption (NGN)", text: $amount)
                        .keyboardType(.numberPad)
                    TextField("Maximum Uses", text: $maxUses)
                        .keyboardType(.numberPad)
                }
                
                Section("Settings") {
                    DatePicker("Expires At", selection: $expiryDate, displayedComponents: .date)
                }
            }
            .navigationTitle("New Coupon")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task {
                            await viewModel.createCoupon(
                                amount: Int(amount) ?? 0,
                                maxUses: Int(maxUses) ?? 0,
                                name: name.isEmpty ? nil : name,
                                expiresAt: expiryDate
                            )
                            dismiss()
                        }
                    }
                    .disabled(amount.isEmpty || maxUses.isEmpty || viewModel.isLoading)
                }
            }
        }
    }
}

#Preview {
    CouponsView()
}
