import SwiftUI

struct DataView: View {
    @StateObject private var viewModel = VTUViewModel()
    @StateObject private var beneficiaryViewModel = BeneficiaryViewModel()
    
    @State private var phoneNumber: String = ""
    @State private var selectedNetwork: String = "MTN"
    @State private var selectedVariationCode: String = ""
    
    let networks = ["MTN", "Airtel", "Glo", "9mobile"]
    
    @State private var showCheckout = false
    @State private var showBeneficiaryPicker = false
    @State private var saveBeneficiary = false
    @State private var beneficiaryName = ""
    @SwiftUI.Environment(\.dismiss) var dismiss
    
    var selectedVariation: VariationResponse? {
        viewModel.variations.first(where: { $0.variation_code == selectedVariationCode })
    }
    
    var body: some View {
        Form {
            Section(header: Text("Details")) {
                Picker("Network", selection: $selectedNetwork) {
                    ForEach(networks, id: \.self) { network in
                        Text(network).tag(network)
                    }
                }
                .onChange(of: selectedNetwork) { _ in
                    fetchPlans()
                }
                
                TextField("Phone Number", text: $phoneNumber)
                    .keyboardType(.phonePad)
                
                Picker("Data Plan", selection: $selectedVariationCode) {
                    Text("Select Plan").tag("")
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
            
            Section {
                Toggle("Save as Beneficiary", isOn: $saveBeneficiary)
                if saveBeneficiary {
                    TextField("Beneficiary Name (e.g., Dad's Data)", text: $beneficiaryName)
                }
            }

            Button(action: {
                showCheckout = true
            }) {
                HStack {
                    Spacer()
                    if viewModel.isLoading {
                        ProgressView()
                    } else {
                        Text("Proceed")
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
            }
            .disabled(phoneNumber.isEmpty || selectedVariationCode.isEmpty || viewModel.isLoading)
        }
        .navigationTitle("Buy Data")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showBeneficiaryPicker = true }) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .accessibilityLabel("Autofill Beneficiary")
                }
            }
        }
        .onAppear { fetchPlans() }
        .sheet(isPresented: $showCheckout) {
            if let variation = selectedVariation {
                CheckoutSheet(
                    serviceName: "Data (\(variation.name))",
                    identifier: phoneNumber,
                    amount: Double(variation.variation_amount) ?? 0.0,
                    onConfirm: { pin in
                        showCheckout = false
                        
                        if saveBeneficiary && !beneficiaryName.isEmpty {
                            Task {
                                await beneficiaryViewModel.addBeneficiary(
                                    name: beneficiaryName,
                                    serviceType: "data",
                                    providerServiceId: phoneNumber,
                                    category: "mobile",
                                    metadata: ["network": selectedNetwork]
                                )
                            }
                        }
                        
                        Task {
                            await viewModel.initiateTransaction(
                                serviceType: "data",
                                serviceId: "\(selectedNetwork.lowercased())-data",
                                providerServiceId: phoneNumber,
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
            BeneficiaryPickerSheet(serviceType: "data", selectedBeneficiary: Binding(
                get: { nil },
                set: { beneficiary in
                    if let beneficiary = beneficiary {
                        phoneNumber = beneficiary.providerServiceId
                        if let network = beneficiary.metadata?["network"] as? String {
                            selectedNetwork = network
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
    
    private func fetchPlans() {
        Task {
            await viewModel.fetchVariations(serviceId: "\(selectedNetwork.lowercased())-data")
            selectedVariationCode = ""
        }
    }
}
