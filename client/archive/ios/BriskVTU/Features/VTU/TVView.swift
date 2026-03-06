import SwiftUI

struct TVView: View {
    @StateObject private var viewModel = VTUViewModel()
    @StateObject private var beneficiaryViewModel = BeneficiaryViewModel()
    
    @State private var smartcard: String = ""
    @State private var selectedBiller: String = "dstv"
    @State private var selectedVariationCode: String = ""
    
    let billers = ["dstv", "gotv", "startimes"]
    
    @State private var showCheckout = false
    @State private var showBeneficiaryPicker = false
    @State private var verifyAndProceed = false
    @State private var saveBeneficiary = false
    @State private var beneficiaryName = ""
    @SwiftUI.Environment(\.dismiss) var dismiss
    
    var selectedVariation: VariationResponse? {
        viewModel.variations.first(where: { $0.variation_code == selectedVariationCode })
    }
    
    var body: some View {
        Form {
            Section(header: Text("Details")) {
                Picker("TV Provider", selection: $selectedBiller) {
                    ForEach(billers, id: \.self) { biller in
                        Text(biller.uppercased()).tag(biller)
                    }
                }
                .onChange(of: selectedBiller) { _ in
                    fetchBouquets()
                }
                
                TextField("Smartcard Number", text: $smartcard)
                    .keyboardType(.numberPad)
                
                Picker("Bouquet", selection: $selectedVariationCode) {
                    Text("Select Bouquet").tag("")
                    ForEach(viewModel.variations) { variation in
                        Text(variation.name).tag(variation.variation_code)
                    }
                }
            }
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.footnote)
                    .padding(.horizontal)
            }
            
            if let verifiedName = viewModel.verifiedName {
                HStack {
                    Text("Customer:")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(verifiedName)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
                .padding(.horizontal)
            }
            
            Section {
                Toggle("Save as Beneficiary", isOn: $saveBeneficiary)
                if saveBeneficiary {
                    TextField("Beneficiary Name (e.g., Home DSTV)", text: $beneficiaryName)
                }
            }

            Button(action: {
                verifyAndProceed = true
                Task {
                    await viewModel.verifyMerchant(
                        billerCode: smartcard,
                        providerServiceId: selectedBiller,
                        serviceType: "tv-subscription"
                    )
                }
            }) {
                HStack {
                    Spacer()
                    if viewModel.isLoading {
                        ProgressView()
                    } else {
                        Text("Verify & Proceed")
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
            }
            .disabled(smartcard.isEmpty || selectedVariationCode.isEmpty || viewModel.isLoading)
        }
        .navigationTitle("TV Subscription")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showBeneficiaryPicker = true }) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .accessibilityLabel("Autofill Beneficiary")
                }
            }
        }
        .onAppear { fetchBouquets() }
        .onChange(of: viewModel.verifiedName) { name in
            if name != nil && verifyAndProceed {
                showCheckout = true
                verifyAndProceed = false
            }
        }
        .sheet(isPresented: $showCheckout) {
            if let variation = selectedVariation {
                CheckoutSheet(
                    serviceName: "TV (\(variation.name))",
                    identifier: "\(smartcard) (\(viewModel.verifiedName ?? ""))",
                    amount: Double(variation.variation_amount) ?? 0.0,
                    onConfirm: { pin in
                        showCheckout = false
                        
                        if saveBeneficiary && !beneficiaryName.isEmpty {
                            Task {
                                await beneficiaryViewModel.addBeneficiary(
                                    name: beneficiaryName,
                                    serviceType: "tv-subscription",
                                    providerServiceId: smartcard,
                                    category: "tv",
                                    metadata: ["provider": selectedBiller, "customerName": viewModel.verifiedName ?? ""]
                                )
                            }
                        }
                        
                        Task {
                            await viewModel.initiateTransaction(
                                serviceType: "tv-subscription",
                                serviceId: selectedBiller,
                                providerServiceId: smartcard,
                                amount: Double(variation.variation_amount) ?? 0.0,
                                variationCode: variation.variation_code
                            )
                        }
                    },
                    onDismiss: { showCheckout = false }
                )
            }
        }
        .sheet(isPresented: $showBeneficiaryPicker) {
            BeneficiaryPickerSheet(serviceType: "tv-subscription", selectedBeneficiary: Binding(
                get: { nil },
                set: { beneficiary in
                    if let beneficiary = beneficiary {
                        smartcard = beneficiary.providerServiceId
                        if let provider = beneficiary.metadata?["provider"] as? String {
                            selectedBiller = provider
                        }
                    }
                }
            ))
        }
        .fullScreenCover(item: $viewModel.transactionResult) { result in
            VTUReceiptView(
                status: result.status,
                serviceType: result.serviceType,
                amount: result.amount,
                referenceId: result.referenceId,
                createdAt: result.createdAt,
                onDone: {
                    viewModel.resetState()
                    dismiss()
                }
            )
        }
    }
    
    private func fetchBouquets() {
        Task {
            await viewModel.fetchVariations(serviceId: selectedBiller)
            selectedVariationCode = ""
        }
    }
}
