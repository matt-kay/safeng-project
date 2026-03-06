package com.solutioncrafts.BriskVTU.feature.transactions

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solutioncrafts.BriskVTU.core.models.Transaction
import com.solutioncrafts.BriskVTU.core.models.TransactionStatus
import com.solutioncrafts.BriskVTU.core.models.TransactionType
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    viewModel: TransactionsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTransaction by remember { mutableStateOf<Transaction?>(null) }

    if (selectedTransaction != null) {
        ReceiptDialog(
            transaction = selectedTransaction!!,
            onDismiss = { selectedTransaction = null }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Transactions", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (val state = uiState) {
                is TransactionsUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is TransactionsUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(state.message, style = MaterialTheme.typography.bodyLarge)
                        Button(onClick = { viewModel.fetchTransactions() }) {
                            Text("Retry")
                        }
                    }
                }
                is TransactionsUiState.Success -> {
                    if (state.transactions.isEmpty()) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("No transactions yet")
                        }
                    } else {
                        LazyColumn {
                            items(state.transactions) { transaction ->
                                TransactionItem(
                                    transaction = transaction,
                                    onClick = { selectedTransaction = transaction }
                                )
                                HorizontalDivider(
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                    thickness = 0.5.dp,
                                    color = MaterialTheme.colorScheme.outlineVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TransactionItem(
    transaction: Transaction,
    onClick: () -> Unit
) {
    ListItem(
        modifier = Modifier.clickable { onClick() },
        headlineContent = {
            val title = when (transaction.type) {
                TransactionType.TOP_UP -> "Wallet Top-up"
                TransactionType.PAYMENT -> transaction.metadata?.get("service_name")?.jsonPrimitive?.contentOrNull ?: "Bill Payment"
                TransactionType.CASHBACK -> "Cashback Earned"
                TransactionType.REFUND -> "Refund"
            }
            Text(title, fontWeight = FontWeight.SemiBold)
        },
        supportingContent = {
            Text(transaction.createdAt.substringBefore("T")) // Simple date formatting
        },
        leadingContent = {
            val icon = when (transaction.type) {
                TransactionType.TOP_UP -> Icons.Default.AddCircle
                TransactionType.PAYMENT -> Icons.Default.ShoppingCart
                TransactionType.CASHBACK -> Icons.Default.Star
                TransactionType.REFUND -> Icons.Default.Refresh
            }
            val color = when (transaction.status) {
                TransactionStatus.SUCCESS -> Color(0xFF4CAF50)
                TransactionStatus.FAILED -> Color(0xFFF44336)
                else -> Color(0xFFFF9800)
            }
            Surface(
                shape = MaterialTheme.shapes.small,
                color = color.copy(alpha = 0.1f)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.padding(8.dp)
                )
            }
        },
        trailingContent = {
            val prefix = when (transaction.type) {
                TransactionType.TOP_UP, TransactionType.CASHBACK, TransactionType.REFUND -> "+"
                TransactionType.PAYMENT -> "-"
            }
            val color = when (transaction.type) {
                TransactionType.TOP_UP, TransactionType.CASHBACK, TransactionType.REFUND -> Color(0xFF4CAF50)
                TransactionType.PAYMENT -> MaterialTheme.colorScheme.onSurface
            }
            Text(
                text = prefix + transaction.formattedAmount,
                color = color,
                fontWeight = FontWeight.Bold
            )
        }
    )
}

@Composable
fun ReceiptDialog(
    transaction: Transaction,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        },
        title = {
            Text("Transaction Details", fontWeight = FontWeight.Bold)
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Status", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    val color = when (transaction.status) {
                        TransactionStatus.SUCCESS -> Color(0xFF4CAF50)
                        TransactionStatus.FAILED -> Color(0xFFF44336)
                        else -> Color(0xFFFF9800)
                    }
                    Text(transaction.status.name, color = color, fontWeight = FontWeight.Bold)
                }
                
                ReceiptRow("Type", transaction.type.name.replace("_", " "))
                ReceiptRow("Reference", transaction.id)
                ReceiptRow("Date", transaction.createdAt.replace("T", " ").substringBefore("."))
                
                transaction.metadata?.get("service_name")?.jsonPrimitive?.contentOrNull?.let {
                    ReceiptRow("Service", it)
                }
                
                transaction.metadata?.get("beneficiary")?.jsonPrimitive?.contentOrNull?.let {
                    ReceiptRow("Beneficiary", it)
                }
                
                HorizontalDivider()
                
                ReceiptRow("Amount", transaction.formattedAmount)
                ReceiptRow("Fee", transaction.formattedFee)
                
                HorizontalDivider()
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total", fontWeight = FontWeight.Bold)
                    Text(transaction.formattedAmount, fontWeight = FontWeight.Bold)
                }
            }
        }
    )
}

@Composable
fun ReceiptRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.Medium)
    }
}
