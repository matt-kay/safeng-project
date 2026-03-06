package com.solutioncrafts.BriskVTU.core.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class PreferencesManager(private val context: Context) {

    companion object {
        val HAS_SEEN_ONBOARDING = booleanPreferencesKey("has_seen_onboarding")
        val THEME_MODE = intPreferencesKey("theme_mode")
        val HAPTIC_FEEDBACK = booleanPreferencesKey("haptic_feedback")
    }

    val hasSeenOnboarding: Flow<Boolean> = context.dataStore.data
        .map { it[HAS_SEEN_ONBOARDING] ?: false }

    val themeMode: Flow<Int> = context.dataStore.data
        .map { it[THEME_MODE] ?: 0 }

    val hapticFeedback: Flow<Boolean> = context.dataStore.data
        .map { it[HAPTIC_FEEDBACK] ?: true }

    suspend fun saveOnboardingCompleted() {
        context.dataStore.edit { it[HAS_SEEN_ONBOARDING] = true }
    }

    suspend fun setThemeMode(mode: Int) {
        context.dataStore.edit { it[THEME_MODE] = mode }
    }

    suspend fun setHapticFeedback(enabled: Boolean) {
        context.dataStore.edit { it[HAPTIC_FEEDBACK] = enabled }
    }
}
