import '../models/sync_mutation.dart';

class SyncQueueStore {
  const SyncQueueStore();

  List<SyncMutation> enqueue(List<SyncMutation> queue, SyncMutation mutation) {
    final byKey = <String, SyncMutation>{
      for (final item in queue) item.queueKey: item,
    };
    byKey[mutation.queueKey] = mutation;
    final nextQueue = byKey.values.toList();
    nextQueue.sort(
      (left, right) => left.clientUpdatedAt.compareTo(right.clientUpdatedAt),
    );
    return nextQueue;
  }

  List<SyncMutation> removeByIds(
    List<SyncMutation> queue,
    Iterable<String> mutationIds,
  ) {
    final idSet = mutationIds.toSet();
    return queue.where((mutation) => !idSet.contains(mutation.id)).toList();
  }
}
