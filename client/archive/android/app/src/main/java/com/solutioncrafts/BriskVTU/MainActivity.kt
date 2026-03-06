package com.solutioncrafts.BriskVTU

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.solutioncrafts.BriskVTU.core.datastore.PreferencesManager
import com.solutioncrafts.BriskVTU.ui.navigation.AppNavGraph
import com.solutioncrafts.BriskVTU.ui.navigation.Route
import com.solutioncrafts.BriskVTU.ui.theme.BriskVTUTheme
import com.solutioncrafts.BriskVTU.core.auth.UserSessionManager
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.runtime.CompositionLocalProvider

class MainActivity : ComponentActivity() {

    private lateinit var preferencesManager: PreferencesManager
    private var isLoading = true
    private var startDestination: String = Route.Onboarding.route

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

        if (BuildConfig.DEBUG) {
            com.google.firebase.auth.FirebaseAuth.getInstance().useEmulator("10.0.2.2", 9099)
        }
        
        preferencesManager = PreferencesManager(this)

        // Hold splash screen while determining the start destination
        splashScreen.setKeepOnScreenCondition { isLoading }

        lifecycleScope.launch {
            val hasSeenOnboarding = preferencesManager.hasSeenOnboarding.first()
            val sessionManager = UserSessionManager.getInstance()
            
            startDestination = when {
                !hasSeenOnboarding -> Route.Onboarding.route
                com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null -> Route.Login.route
                else -> {
                    // User is signed in, check if profile exists
                    val session = sessionManager.sessionState
                        .filter { it.isAuthenticated }
                        .first()
                    
                    if (session.profile != null) Route.Main.route else Route.SetupProfile.route
                }
            }
            isLoading = false
        }

        enableEdgeToEdge()
        setContent {
            val themeMode = preferencesManager.themeMode.collectAsState(initial = 0).value
            val isSystemDark = androidx.compose.foundation.isSystemInDarkTheme()
            val darkMode = if (themeMode == 0) isSystemDark else themeMode == 2
            
            val hapticFeedbackEnabled = preferencesManager.hapticFeedback.collectAsState(initial = true).value
            
            val customHapticFeedback = object : HapticFeedback {
                override fun performHapticFeedback(hapticFeedbackType: HapticFeedbackType) {
                    if (hapticFeedbackEnabled) {
                        // We need the default haptic feedback to actually perform the action
                        // We'll capture it from the composition locals further down or we can just let it pass through
                    }
                }
            }

            BriskVTUTheme(darkTheme = darkMode) {
                // Here we intercept the haptic feedback request
                val defaultHapticFeedback = LocalHapticFeedback.current
                val interceptingHapticFeedback = object : HapticFeedback {
                    override fun performHapticFeedback(hapticFeedbackType: HapticFeedbackType) {
                        if (hapticFeedbackEnabled) {
                            defaultHapticFeedback.performHapticFeedback(hapticFeedbackType)
                        }
                    }
                }

                CompositionLocalProvider(LocalHapticFeedback provides interceptingHapticFeedback) {
                    if (!isLoading) {
                        AppNavGraph(startDestination = startDestination)
                    }
                }
            }
        }
    }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello $name!",
        modifier = modifier
    )
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    BriskVTUTheme {
        Greeting("Android")
    }
}