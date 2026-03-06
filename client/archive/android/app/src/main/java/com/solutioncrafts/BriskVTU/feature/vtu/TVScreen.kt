package com.solutioncrafts.BriskVTU.feature.vtu

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solutioncrafts.BriskVTU.feature.beneficiaries.BeneficiaryPickerBottomSheet
import com.solutioncrafts.BriskVTU.feature.beneficiaries.BeneficiaryViewModel
import com.solutioncrafts.BriskVTU.feature.beneficiaries.CreateBeneficiaryRequest
import androidx.compose.material.icons.filled.ContactPage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TVScreen(
    onNavigateBack: () -> Unit,
    viewModel: VTUViewModel = viewModel(),
    beneficiaryViewModel: BeneficiaryViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var smartcard by remember { mutableStateOf("") }
    var selectedBiller by remember { mutableStateOf("dstv") }
    var selectedVariation by remember { mutableStateOf<VariationResponse?>(null) }
    
    // Fetch variations when biller changes
    LaunchedEffect(selectedBiller) {
        viewModel.fetchVariations(selectedBiller)
    }

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

    // Automatically trigger checkout once verifiedName is retrieved if they pressed proceed
    var proceedTapped by remember { mutableStateOf(false) }
    
    LaunchedEffect(uiState.verifiedName, uiState.error) {
        if (proceedTapped) {
            if (uiState.verifiedName != null) {
                // Name verified -> show checkout
                showCheckout = true
                proceedTapped = false
            } else if (uiState.error != null) {
                // Verify failed -> cancel proceed
                proceedTapped = false
            }
        }
    }

    if (showCheckout && selectedVariation != null) {
        CheckoutDialog(
            serviceName = "TV (${selectedVariation!!.name})",
            identifier = "$smartcard (${uiState.verifiedName})",
            amount = selectedVariation!!.variation_amount.toDoubleOrNull() ?: 0.0,
            onConfirm = { pin ->
                showCheckout = false
                
                if (saveBeneficiary && beneficiaryName.isNotBlank()) {
                    beneficiaryViewModel.addBeneficiary(
                        CreateBeneficiaryRequest(
                            name = beneficiaryName,
                            serviceType = "tv-subscription",
                            providerServiceId = smartcard,
                            category = "tv",
                            metadata = mapOf("provider" to selectedBiller, "customerName" to (uiState.verifiedName ?: ""))
                        )
                    )
                }
                
                viewModel.initiateTransaction(
                    serviceType = "tv-subscription",
                    serviceId = selectedBiller,
                    providerServiceId = smartcard,
                    amount = selectedVariation!!.variation_amount.toDoubleOrNull() ?: 0.0,
                    variationCode = selectedVariation!!.variation_code
                )
            },
            onDismiss = { showCheckout = false }
        )
    }

    if (showBeneficiaryPicker) {
        BeneficiaryPickerBottomSheet(
            serviceType = "tv-subscription",
            onDismiss = { showBeneficiaryPicker = false },
            onSelect = { beneficiary ->
                smartcard = beneficiary.providerServiceId
                beneficiary.metadata?.get("provider")?.let { selectedBiller = it }
                showBeneficiaryPicker = false
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("TV Subscription") },
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

            var expandedBiller by remember { mutableStateOf(false) }
            val billers = listOf("dstv", "gotv", "startimes")
            
            ExposedDropdownMenuBox(
                expanded = expandedBiller,
                onExpandedChange = { expandedBiller = !expandedBiller }
            ) {
                OutlinedTextField(
                    value = selectedBiller.uppercase(),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("TV Provider") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedBiller) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expandedBiller,
                    onDismissRequest = { expandedBiller = false }
                ) {
                    billers.forEach { b ->
                        DropdownMenuItem(
                            text = { Text(b.uppercase()) },
                            onClick = {
                                selectedBiller = b
                                selectedVariation = null
                                expandedBiller = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = smartcard,
                onValueChange = { smartcard = it },
                label = { Text("Smartcard Number") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            var expandedPlan by remember { mutableStateOf(false) }
            
            ExposedDropdownMenuBox(
                expanded = expandedPlan,
                onExpandedChange = { expandedPlan = !expandedPlan }
            ) {
                OutlinedTextField(
                    value = selectedVariation?.name ?: "Select Bouquet",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Bouquet") },
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
            }
            
            if (uiState.verifiedName != null && !proceedTapped) {
                Text(
                    text = "Customer: ${uiState.verifiedName}",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Checkbox(checked = saveBeneficiary, onCheckedChange = { saveBeneficiary = it })
                Text("Save as Beneficiary")
            }
            
            if (saveBeneficiary) {
                OutlinedTextField(
                    value = beneficiaryName,
                    onValueChange = { beneficiaryName = it },
                    label = { Text("Beneficiary Name (e.g., Home DSTV)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Button(
                onClick = {
                    proceedTapped = true
                    viewModel.verifyMerchant(
                        billerCode = smartcard,
                        providerServiceId = selectedBiller,
                        serviceType = "tv-subscription"
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = smartcard.isNotBlank() && selectedVariation != null && !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Verify & Proceed")
                }
            }
        }
    }
}
