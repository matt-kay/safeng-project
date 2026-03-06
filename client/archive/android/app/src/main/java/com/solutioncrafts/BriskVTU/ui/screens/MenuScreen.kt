package com.solutioncrafts.BriskVTU.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import coil.compose.AsyncImage
import com.google.firebase.auth.FirebaseAuth
import com.solutioncrafts.BriskVTU.core.auth.UserSessionManager
import com.solutioncrafts.BriskVTU.core.datastore.PreferencesManager
import kotlinx.coroutines.launch

data class MenuOption(
    val title: String,
    val icon: ImageVector,
    val route: String? = null,
    val onClick: (() -> Unit)? = null,
    val isDestructive: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuScreen(
    onNavigateToProfileEdit: () -> Unit,
    onNavigateToChangePhoneNumber: () -> Unit,
    onNavigateToBeneficiaries: () -> Unit,
    onNavigateToCoupons: () -> Unit,
    onNavigateToTransactions: () -> Unit,
    onNavigateToAboutApp: () -> Unit,
    onNavigateToContactUs: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val userSessionManager = remember { UserSessionManager.getInstance() }
    val sessionState by userSessionManager.sessionState.collectAsState()
    val preferencesManager = remember { PreferencesManager(context) }
    
    val themeMode by preferencesManager.themeMode.collectAsState(initial = 0)
    val isSystemDark = androidx.compose.foundation.isSystemInDarkTheme()
    val isDark = if (themeMode == 0) isSystemDark else themeMode == 2
    
    val hapticFeedback by preferencesManager.hapticFeedback.collectAsState(initial = true)
    val scope = rememberCoroutineScope()

    val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
    val versionString = "Version ${packageInfo.versionName} (Build ${if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) packageInfo.longVersionCode else packageInfo.versionCode})"

    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to log out?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    }
                ) {
                    Text("Logout", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Menu", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Section 1: User Profile Card
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AsyncImage(
                            model = "https://api.dicebear.com/7.x/avataaars/png?seed=${sessionState.profile?.id ?: "default"}",
                            contentDescription = "Avatar",
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = "${sessionState.profile?.firstName ?: "User"} ${sessionState.profile?.lastName ?: ""}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = sessionState.profile?.phoneNumber ?: "No phone number",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Section 2: Account Management
            item { SectionHeader("Account") }
            item {
                MenuItem("Update Profile", Icons.Default.Person, onClick = onNavigateToProfileEdit)
                MenuItem("Change Phone Number", Icons.Default.Phone, onClick = onNavigateToChangePhoneNumber)
                MenuItem("Beneficiaries", Icons.Default.Favorite, onClick = onNavigateToBeneficiaries)
                MenuItem("Transactions", Icons.Default.List, onClick = onNavigateToTransactions)
                MenuItem("Coupons", Icons.Default.Star, onClick = onNavigateToCoupons)
            }

            // Section 3: App Settings
            item { SectionHeader("Settings") }
            item {
                SettingsToggleItem(
                    title = "Dark Mode",
                    icon = Icons.Default.Settings,
                    checked = isDark,
                    onCheckedChange = { scope.launch { preferencesManager.setThemeMode(if (it) 2 else 1) } }
                )
                SettingsToggleItem(
                    title = "Haptic Feedback",
                    icon = Icons.Default.Notifications,
                    checked = hapticFeedback,
                    onCheckedChange = { scope.launch { preferencesManager.setHapticFeedback(it) } }
                )
            }

            // Section 4: Support & Information
            item { SectionHeader("Support") }
            item {
                MenuItem("About App", Icons.Default.Info, onClick = onNavigateToAboutApp)
                MenuItem("Contact Us", Icons.Default.Email, onClick = onNavigateToContactUs)
            }

            // Logout
            item {
                Spacer(modifier = Modifier.height(16.dp))
                ListItem(
                    headlineContent = { Text("Logout", color = Color.Red, fontWeight = FontWeight.Bold) },
                    leadingContent = { Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.Red) },
                    modifier = Modifier.clickable { showLogoutDialog = true }
                )
            }

            // Footer
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = versionString,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp)
    )
}

@Composable
fun MenuItem(title: String, icon: ImageVector, isDestructive: Boolean = false, onClick: () -> Unit) {
    ListItem(
        headlineContent = { 
            Text(
                text = title,
                color = if (isDestructive) Color.Red else Color.Unspecified,
                fontWeight = FontWeight.Medium
            ) 
        },
        leadingContent = { 
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isDestructive) Color.Red else MaterialTheme.colorScheme.primary
            ) 
        },
        trailingContent = {
            Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null)
        },
        modifier = Modifier.clickable { onClick() }
    )
}

@Composable
fun SettingsToggleItem(title: String, icon: ImageVector, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    ListItem(
        headlineContent = { Text(text = title, fontWeight = FontWeight.Medium) },
        leadingContent = { Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
        trailingContent = {
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    )
}
