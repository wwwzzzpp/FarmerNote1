import 'package:flutter/widgets.dart';

import 'app/farmernote_bootstrap_app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FarmerNoteBootstrapApp());
}
