package com.solutioncrafts.BriskVTU.feature.vtu

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solutioncrafts.BriskVTU.feature.beneficiaries.BeneficiaryPickerBottomSheet
import com.solutioncrafts.BriskVTU.feature.beneficiaries.BeneficiaryViewModel
import com.solutioncrafts.BriskVTU.feature.beneficiaries.CreateBeneficiaryRequest
import androidx.compose.material.icons.filled.ContactPage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DataScreen(
    onNavigateBack: () -> Unit,
    viewModel: VTUViewModel = viewModel(),
    beneficiaryViewModel: BeneficiaryViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    var phoneNumber by remember { mutableStateOf("") }
    var selectedNetwork by remember { mutableStateOf("MTN") }
    // When network changes, fetch variations
    LaunchedEffect(selectedNetwork) {
        viewModel.fetchVariations("${selectedNetwork.lowercase()}-data")
    }

    var selectedVariation by remember { mutableStateOf<VariationResponse?>(null) }
    var showCheckout by remember { mutableStateOf(false) }
    var showBeneficiaryPicker by remember { mutableStateOf(false) }
    
    var saveBeneficiary by remember { mutableStateOf(false) }
    var beneficiaryName by remember { mutableStateOf("") }

    if (uiState.transactionResult != null) {
        ReceiptScreen(
            status = uiState.transactionResult!!.status,
            serviceType = uiState.transactionResult!!.serviceType,
            amount = uiState.transactionResult!!.amount,
            referenceId = uiState.transactionResult!!.referenceId,
            createdAt = uiState.transactionResult!!.createdAt,
            onDone = { 
                viewModel.resetState()
                onNavigateBack()
            }
        )
        return
    }

    if (showCheckout && selectedVariation != null) {
        CheckoutDialog(
            serviceName = "Data (${selectedVariation!!.name})",
            identifier = phoneNumber,
            amount = selectedVariation!!.variation_amount.toDoubleOrNull() ?: 0.0,
            onConfirm = { pin ->
                showCheckout = false
                
                if (saveBeneficiary && beneficiaryName.isNotBlank()) {
                    beneficiaryViewModel.addBeneficiary(
                        CreateBeneficiaryRequest(
                            name = beneficiaryName,
                            serviceType = "data",
                            providerServiceId = phoneNumber,
                            category = "mobile",
                            metadata = mapOf("network" to selectedNetwork)
                        )
                    )
                }
                
                viewModel.initiateTransaction(
                    serviceType = "data",
                    serviceId = "${selectedNetwork.lowercase()}-data",
                    providerServiceId = phoneNumber,
                    amount = selectedVariation!!.variation_amount.toDoubleOrNull() ?: 0.0,
                    variationCode = selectedVariation!!.variation_code
                )
            },
            onDismiss = { showCheckout = false }
        )
    }

    if (showBeneficiaryPicker) {
        BeneficiaryPickerBottomSheet(
            serviceType = "data",
            onDismiss = { showBeneficiaryPicker = false },
            onSelect = { beneficiary ->
                phoneNumber = beneficiary.providerServiceId
                beneficiary.metadata?.get("network")?.let { selectedNetwork = it }
                showBeneficiaryPicker = false
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Buy Data") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showBeneficiaryPicker = true }) {
                        Icon(Icons.Default.ContactPage, contentDescription = "Autofill Beneficiary")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            var expandedNet by remember { mutableStateOf(false) }
            val networks = listOf("MTN", "Airtel", "Glo", "9mobile")
            
            ExposedDropdownMenuBox(
                expanded = expandedNet,
                onExpandedChange = { expandedNet = !expandedNet }
            ) {
                OutlinedTextField(
                    value = selectedNetwork,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Network provider") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedNet) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expandedNet,
                    onDismissRequest = { expandedNet = false }
                ) {
                    networks.forEach { network ->
                        DropdownMenuItem(
                            text = { Text(network) },
                            onClick = {
                                selectedNetwork = network
                                selectedVariation = null
                                expandedNet = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = phoneNumber,
                onValueChange = { phoneNumber = it },
                label = { Text("Phone Number") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth()
            )

            var expandedPlan by remember { mutableStateOf(false) }
            
            ExposedDropdownMenuBox(
                expanded = expandedPlan,
                onExpandedChange = { expandedPlan = !expandedPlan }
            ) {
                OutlinedTextField(
                    value = selectedVariation?.name ?: "Select Plan",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Data Plan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedPlan) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expandedPlan,
                    onDismissRequest = { expandedPlan = false }
                ) {
                    uiState.variations.forEach { variation ->
                        DropdownMenuItem(
                            text = { Text(variation.name) },
                            onClick = {
                                selectedVariation = variation
                                expandedPlan = false
                            }
                        )
                    }
            }

            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Checkbox(checked = saveBeneficiary, onCheckedChange = { saveBeneficiary = it })
                Text("Save as Beneficiary")
            }
            
            if (saveBeneficiary) {
                OutlinedTextField(
                    value = beneficiaryName,
                    onValueChange = { beneficiaryName = it },
                    label = { Text("Beneficiary Name (e.g., Dad's Data)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Button(
                onClick = { showCheckout = true },
                modifier = Modifier.fillMaxWidth(),
                enabled = phoneNumber.isNotBlank() && selectedVariation != null && !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Proceed")
                }
            }
        }
    }
}
