class CropPlanCatalog {
  const CropPlanCatalog({
    required this.version,
    required this.regionCode,
    required this.regionName,
    required this.crops,
  });

  final int version;
  final String regionCode;
  final String regionName;
  final List<CropTemplate> crops;

  factory CropPlanCatalog.fromJson(Map<String, dynamic> json) {
    final rawCrops = json['crops'];
    return CropPlanCatalog(
      version: json['version'] is int
          ? json['version'] as int
          : int.tryParse((json['version'] ?? '').toString()) ?? 1,
      regionCode: (json['regionCode'] ?? '').toString(),
      regionName: (json['regionName'] ?? '').toString(),
      crops: rawCrops is List
          ? rawCrops
                .whereType<Map<dynamic, dynamic>>()
                .map(
                  (item) => CropTemplate.fromJson(item.cast<String, dynamic>()),
                )
                .toList()
          : const <CropTemplate>[],
    );
  }

  CropTemplate? findCrop(String cropCode) {
    for (final crop in crops) {
      if (crop.cropCode == cropCode) {
        return crop;
      }
    }
    return null;
  }
}

class CropTemplate {
  const CropTemplate({
    required this.cropCode,
    required this.cropName,
    required this.anchorLabel,
    required this.stages,
  });

  final String cropCode;
  final String cropName;
  final String anchorLabel;
  final List<StageTemplate> stages;

  factory CropTemplate.fromJson(Map<String, dynamic> json) {
    final rawStages = json['stages'];
    return CropTemplate(
      cropCode: (json['cropCode'] ?? '').toString(),
      cropName: (json['cropName'] ?? '').toString(),
      anchorLabel: (json['anchorLabel'] ?? '').toString(),
      stages: rawStages is List
          ? rawStages
                .whereType<Map<dynamic, dynamic>>()
                .map(
                  (item) =>
                      StageTemplate.fromJson(item.cast<String, dynamic>()),
                )
                .toList()
          : const <StageTemplate>[],
    );
  }

  List<ActionContext> buildActionContexts() {
    final contexts = <ActionContext>[];
    for (var stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
      final stage = stages[stageIndex];
      for (
        var milestoneIndex = 0;
        milestoneIndex < stage.milestones.length;
        milestoneIndex += 1
      ) {
        final milestone = stage.milestones[milestoneIndex];
        for (
          var actionIndex = 0;
          actionIndex < milestone.actions.length;
          actionIndex += 1
        ) {
          final action = milestone.actions[actionIndex];
          contexts.add(
            ActionContext(
              crop: this,
              stage: stage,
              milestone: milestone,
              action: action,
              orderKey:
                  '${stageIndex.toString().padLeft(2, '0')}-${milestoneIndex.toString().padLeft(2, '0')}-${actionIndex.toString().padLeft(2, '0')}',
            ),
          );
        }
      }
    }
    return contexts;
  }
}

class StageTemplate {
  const StageTemplate({
    required this.id,
    required this.name,
    required this.offsetStartDays,
    required this.offsetEndDays,
    required this.milestones,
  });

  final String id;
  final String name;
  final int offsetStartDays;
  final int offsetEndDays;
  final List<MilestoneTemplate> milestones;

  factory StageTemplate.fromJson(Map<String, dynamic> json) {
    final rawMilestones = json['milestones'];
    return StageTemplate(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      offsetStartDays: json['offsetStartDays'] is int
          ? json['offsetStartDays'] as int
          : int.tryParse((json['offsetStartDays'] ?? '').toString()) ?? 0,
      offsetEndDays: json['offsetEndDays'] is int
          ? json['offsetEndDays'] as int
          : int.tryParse((json['offsetEndDays'] ?? '').toString()) ?? 0,
      milestones: rawMilestones is List
          ? rawMilestones
                .whereType<Map<dynamic, dynamic>>()
                .map(
                  (item) =>
                      MilestoneTemplate.fromJson(item.cast<String, dynamic>()),
                )
                .toList()
          : const <MilestoneTemplate>[],
    );
  }
}

class MilestoneTemplate {
  const MilestoneTemplate({
    required this.id,
    required this.name,
    required this.goal,
    required this.actions,
  });

  final String id;
  final String name;
  final String goal;
  final List<ActionTemplate> actions;

  factory MilestoneTemplate.fromJson(Map<String, dynamic> json) {
    final rawActions = json['actions'];
    return MilestoneTemplate(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      goal: (json['goal'] ?? '').toString(),
      actions: rawActions is List
          ? rawActions
                .whereType<Map<dynamic, dynamic>>()
                .map(
                  (item) =>
                      ActionTemplate.fromJson(item.cast<String, dynamic>()),
                )
                .toList()
          : const <ActionTemplate>[],
    );
  }
}

class ActionTemplate {
  const ActionTemplate({
    required this.id,
    required this.name,
    required this.executionStandard,
    required this.steps,
    required this.cautions,
    required this.leadDays,
    required this.keywords,
  });

  final String id;
  final String name;
  final String executionStandard;
  final List<String> steps;
  final List<String> cautions;
  final int leadDays;
  final List<String> keywords;

  factory ActionTemplate.fromJson(Map<String, dynamic> json) {
    List<String> readStringList(Object? value) {
      if (value is! List) {
        return const <String>[];
      }
      return value.map((item) => item.toString()).toList();
    }

    return ActionTemplate(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      executionStandard: (json['executionStandard'] ?? '').toString(),
      steps: readStringList(json['steps']),
      cautions: readStringList(json['cautions']),
      leadDays: json['leadDays'] is int
          ? json['leadDays'] as int
          : int.tryParse((json['leadDays'] ?? '').toString()) ?? 0,
      keywords: readStringList(json['keywords']),
    );
  }
}

class ActionContext {
  const ActionContext({
    required this.crop,
    required this.stage,
    required this.milestone,
    required this.action,
    required this.orderKey,
  });

  final CropTemplate crop;
  final StageTemplate stage;
  final MilestoneTemplate milestone;
  final ActionTemplate action;
  final String orderKey;
}
