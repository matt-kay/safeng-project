package com.solutioncrafts.BriskVTU.feature.coupons

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solutioncrafts.BriskVTU.ui.theme.DeepRed
import com.solutioncrafts.BriskVTU.ui.theme.Orange
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CouponsScreen(
    viewModel: CouponViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val myCoupons by viewModel.myCoupons.collectAsState()
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(0) }
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.fetchMyCoupons()
    }

    LaunchedEffect(uiState) {
        if (uiState is CouponUiState.Success) {
            Toast.makeText(context, (uiState as CouponUiState.Success).message, Toast.LENGTH_LONG).show()
            viewModel.clearState()
        } else if (uiState is CouponUiState.Error) {
            Toast.makeText(context, (uiState as CouponUiState.Error).message, Toast.LENGTH_LONG).show()
            viewModel.clearState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Coupons", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DeepRed,
                    titleContentColor = Color.White
                )
            )
        },
        floatingActionButton = {
            if (selectedTab == 1) {
                FloatingActionButton(
                    onClick = { showCreateDialog = true },
                    containerColor = Orange,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Create Coupon")
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = DeepRed,
                contentColor = Color.White,
                indicator = { tabPositions ->
                    TabRowDefaults.Indicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = Orange,
                        height = 3.dp
                    )
                }
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Redeem", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("My Coupons", fontWeight = FontWeight.Bold) }
                )
            }

            Box(modifier = Modifier.fillMaxSize()) {
                if (selectedTab == 0) {
                    RedeemTab(onRedeem = { viewModel.redeemCoupon(it) }, isLoading = uiState is CouponUiState.Loading)
                } else {
                    MyCouponsTab(
                        coupons = myCoupons,
                        onPause = { viewModel.pauseCoupon(it) },
                        onResume = { viewModel.resumeCoupon(it) },
                        onRevoke = { viewModel.revokeCoupon(it) },
                        isLoading = uiState is CouponUiState.Loading && myCoupons.isEmpty()
                    )
                }

                if (uiState is CouponUiState.Loading && (selectedTab == 0 || myCoupons.isNotEmpty())) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth(),
                        color = Orange,
                        trackColor = DeepRed.copy(alpha = 0.1f)
                    )
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateCouponDialog(
            onDismiss = { showCreateDialog = false },
            onConfirm = { amount, uses, name, expiry ->
                viewModel.createCoupon(amount, uses, name, expiry)
                showCreateDialog = false
            }
        )
    }
}

@Composable
fun RedeemTab(onRedeem: (String) -> Unit, isLoading: Boolean) {
    var code by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .background(
                        Brush.verticalGradient(
                            listOf(DeepRed, DeepRed.copy(alpha = 0.8f))
                        )
                    )
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.ConfirmationNumber,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = Orange
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    "Have a code?",
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Enter your coupon code below to claim your reward",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it.uppercase() },
                    placeholder = { Text("E.G. BRISK-XXXX", color = Color.White.copy(alpha = 0.5f)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    textStyle = MaterialTheme.typography.bodyLarge.copy(
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        letterSpacing = 2.sp
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Orange,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { onRedeem(code) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Orange),
                    enabled = code.isNotBlank() && !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                    } else {
                        Text("Redeem Now", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun MyCouponsTab(
    coupons: List<CouponResponse>,
    onPause: (String) -> Unit,
    onResume: (String) -> Unit,
    onRevoke: (String) -> Unit,
    isLoading: Boolean
) {
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = DeepRed)
        }
    } else if (coupons.isEmpty()) {
        EmptyState(
            icon = Icons.Default.SentimentVeryDissatisfied,
            title = "No Coupons Found",
            description = "You haven't created any coupons yet. Click the + button to create one!"
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(coupons) { coupon ->
                CouponItem(coupon, onPause, onResume, onRevoke)
            }
        }
    }
}

@Composable
fun CouponItem(
    coupon: CouponResponse,
    onPause: (String) -> Unit,
    onResume: (String) -> Unit,
    onRevoke: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        coupon.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        coupon.code,
                        style = MaterialTheme.typography.bodySmall,
                        color = Orange,
                        fontWeight = FontWeight.Bold
                    )
                }
                StatusBadge(status = coupon.status)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoColumn("Amount", "₦${coupon.amountPerUse}")
                InfoColumn("Uses", "${coupon.remainingUses}/${coupon.maxUses}")
                InfoColumn("Expires", formatDate(coupon.expiresAt))
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (coupon.status == "ACTIVE") {
                    ActionButton(Icons.Default.Share, "Share", color = Orange) {
                        val shareIntent = android.content.Intent().apply {
                            action = android.content.Intent.ACTION_SEND
                            putExtra(android.content.Intent.EXTRA_TEXT, "Here's a gift for you! Use coupon code ${coupon.code} on BriskVTU to claim your reward.")
                            type = "text/plain"
                        }
                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Coupon Code"))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    ActionButton(Icons.Default.Pause, "Pause") { onPause(coupon.id) }
                } else if (coupon.status == "PAUSED") {
                    ActionButton(Icons.Default.PlayArrow, "Resume") { onResume(coupon.id) }
                }
                
                if (coupon.status != "REVOKED" && coupon.status != "EXPIRED") {
                    Spacer(modifier = Modifier.width(8.dp))
                    ActionButton(Icons.Default.Delete, "Revoke", color = MaterialTheme.colorScheme.error) {
                        onRevoke(coupon.id)
                    }
                }
            }
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val color = when (status) {
        "ACTIVE" -> Color(0xFF4CAF50)
        "PAUSED" -> Color(0xFFFF9800)
        "REVOKED" -> Color(0xFFF44336)
        "EXPIRED" -> Color(0xFF9E9E9E)
        else -> Color.Gray
    }
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(8.dp),
        border = border(1.dp, color.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
    ) {
        Text(
            text = status,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun InfoColumn(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun ActionButton(icon: ImageVector, label: String, color: Color = DeepRed, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.height(36.dp),
        shape = RoundedCornerShape(10.dp),
        contentPadding = PaddingValues(horizontal = 12.dp),
        border = border(1.dp, color.copy(alpha = 0.5f), RoundedCornerShape(10.dp)),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = color)
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun EmptyState(icon: ImageVector, title: String, description: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = DeepRed.copy(alpha = 0.2f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            description,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray,
            textAlign = TextAlign.Center
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateCouponDialog(onDismiss: () -> Unit, onConfirm: (Int, Int, String?, String?) -> Unit) {
    var amount by remember { mutableStateOf("") }
    var uses by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var daysToExpiry by remember { mutableStateOf("7") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create New Coupon", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Coupon Name (Optional)") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount per Redemption (NGN)") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                )
                OutlinedTextField(
                    value = uses,
                    onValueChange = { uses = it },
                    label = { Text("Maximum Uses") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                )
                OutlinedTextField(
                    value = daysToExpiry,
                    onValueChange = { daysToExpiry = it },
                    label = { Text("Days until Expiry") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amountInt = amount.toIntOrNull() ?: 0
                    val usesInt = uses.toIntOrNull() ?: 0
                    val days = daysToExpiry.toIntOrNull() ?: 7
                    val expiryDate = Calendar.getInstance().apply {
                        add(Calendar.DAY_OF_YEAR, days)
                    }.time
                    val expiryStr = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(expiryDate)
                    
                    if (amountInt > 0 && usesInt > 0) {
                        onConfirm(amountInt, usesInt, name.ifBlank { null }, expiryStr)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Orange)
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = DeepRed)
            }
        }
    )
}

fun formatDate(dateStr: String?): String {
    if (dateStr == null) return "Never"
    return try {
        val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).parse(dateStr)
        SimpleDateFormat("MMM dd, yyyy", Locale.US).format(date)
    } catch (e: Exception) {
        "N/A"
    }
}
