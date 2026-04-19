class AccountDeletionStatus {
  const AccountDeletionStatus({
    required this.status,
    required this.requestedAt,
    required this.scheduledFor,
    required this.confirmedBy,
    required this.message,
  });

  final String status;
  final String requestedAt;
  final String scheduledFor;
  final String confirmedBy;
  final String message;

  bool get isPending => status == 'pending';

  factory AccountDeletionStatus.none() {
    return const AccountDeletionStatus(
      status: 'none',
      requestedAt: '',
      scheduledFor: '',
      confirmedBy: '',
      message: '',
    );
  }

  factory AccountDeletionStatus.fromJson(Map<String, dynamic> json) {
    return AccountDeletionStatus(
      status: (json['status'] ?? 'none').toString(),
      requestedAt: (json['requestedAt'] ?? '').toString(),
      scheduledFor: (json['scheduledFor'] ?? '').toString(),
      confirmedBy: (json['confirmedBy'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
    );
  }
}
