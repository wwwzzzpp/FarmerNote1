import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/stored_app_state.dart';

class AppStorageService {
  static const String storageKey = 'farmernote_flutter_state_v1';

  Future<StoredAppState> loadState() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(storageKey);
    if (raw == null || raw.isEmpty) {
      return StoredAppState.empty();
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return StoredAppState.fromJson(decoded);
      }
      if (decoded is Map) {
        return StoredAppState.fromJson(decoded.cast<String, dynamic>());
      }
    } catch (_) {
      // Fall through to empty state on invalid payloads.
    }

    return StoredAppState.empty();
  }

  Future<void> saveState(StoredAppState state) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(storageKey, jsonEncode(state.toJson()));
  }
}
