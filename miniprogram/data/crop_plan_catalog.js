// Derived from crop_plan_catalog.json for mini program runtime compatibility.
module.exports = {
  "version": 1,
  "regionCode": "henan_huanghuaihai",
  "regionName": "河南/黄淮海",
  "crops": [
    {
      "cropCode": "wheat",
      "cropName": "小麦",
      "anchorLabel": "播种日期",
      "stages": [
        {
          "id": "wheat-pre-sowing",
          "name": "播前与播种期",
          "offsetStartDays": -7,
          "offsetEndDays": 10,
          "milestones": [
            {
              "id": "wheat-prepare-land",
              "name": "土地整备与底肥施入",
              "goal": "让土壤细碎平整、底肥均匀下到位，为一播全苗打基础。",
              "actions": [
                {
                  "id": "wheat-action-check-soil",
                  "name": "看墒情和地力，确定整地方案",
                  "executionStandard": "地表没有明显板结或积水，能明确这一季是否需要深松、旋耕和底肥配方。",
                  "steps": [
                    "先看地块是否板结、是否有暗沟积水、前茬秸秆是否影响播种。",
                    "结合目标产量，确认底肥配方和每亩施用量。",
                    "如果连续多年浅耕，先把深松需求单独记出来。"
                  ],
                  "cautions": [
                    "不要只凭经验下肥，尽量结合土壤和往年产量判断。",
                    "地太湿时不要急着进机械，容易压实土层。"
                  ],
                  "leadDays": 5,
                  "keywords": ["墒情", "地力", "整地", "底肥", "深松"]
                },
                {
                  "id": "wheat-action-till-fertilize",
                  "name": "旋耕深松并把底肥下匀",
                  "executionStandard": "地表平整、土块细碎，底肥撒得匀、翻得透，不影响后续机播。",
                  "steps": [
                    "每 2 到 3 年安排一次 25 到 30 厘米深松，打破犁底层。",
                    "旋耕前先把底肥均匀撒开，再翻入耕层。",
                    "目标亩产 600 公斤时，可参考每亩施 N-P-K 15-15-15 配方肥 40 到 50 公斤。"
                  ],
                  "cautions": [
                    "深松和播种不要间隔太久，防止跑墒。",
                    "肥料不要局部成堆，避免烧苗。"
                  ],
                  "leadDays": 3,
                  "keywords": ["旋耕", "深松", "底肥", "配方肥", "整地"]
                }
              ]
            },
            {
              "id": "wheat-seed-treatment",
              "name": "种子处理与精准播种",
              "goal": "把病虫害风险压在播种前，并把苗数和播深控制在适宜范围。",
              "actions": [
                {
                  "id": "wheat-action-dress-seed",
                  "name": "播前拌种，先防病虫",
                  "executionStandard": "药剂包裹均匀、表面晾干不粘手，拌好的种子能直接上机。",
                  "steps": [
                    "针对纹枯病、全蚀病和地下害虫，提前准备拌种药剂。",
                    "可参考 6% 戊唑醇悬浮种衣剂药种比 1 比 1000。",
                    "地下害虫压力大时，可再配合 70% 噻虫嗪种子处理悬浮剂药种比 1 比 500。"
                  ],
                  "cautions": [
                    "拌种后要阴干，不要暴晒。",
                    "药剂混配前先确认标签，避免随意叠加。"
                  ],
                  "leadDays": 2,
                  "keywords": ["拌种", "戊唑醇", "噻虫嗪", "纹枯病", "地下害虫"]
                },
                {
                  "id": "wheat-action-machine-sowing",
                  "name": "机播时控深控量",
                  "executionStandard": "播深基本在 3 到 5 厘米，基本苗控制合理，出苗整齐。",
                  "steps": [
                    "播前调好开沟器、覆土和镇压部件，保证播深稳定。",
                    "濮阳一带冬小麦适播期可参考 10 月 8 日到 15 日，亩播量 10 到 12.5 公斤。",
                    "如果晚播，每晚 2 天，亩播量增加约 0.5 公斤。"
                  ],
                  "cautions": [
                    "严禁播得过深，超过 5 厘米容易出弱苗。",
                    "地块高低不平时，机播后要回头看行距和漏播。"
                  ],
                  "leadDays": 0,
                  "keywords": ["播种", "机播", "播深", "播量", "基本苗"]
                }
              ]
            }
          ]
        },
        {
          "id": "wheat-winter",
          "name": "冬前及越冬期",
          "offsetStartDays": 11,
          "offsetEndDays": 120,
          "milestones": [
            {
              "id": "wheat-weed-control",
              "name": "冬前除草",
              "goal": "趁杂草小时把草害压下去，避免春后被动加大用药压力。",
              "actions": [
                {
                  "id": "wheat-action-scout-weeds",
                  "name": "先认草相，再定药",
                  "executionStandard": "能分清阔叶草和禾本科杂草，确定本地重点草种再决定方案。",
                  "steps": [
                    "下田看草龄和密度，重点确认播娘蒿、荠菜、节节麦等类型。",
                    "阔叶草可参考氯氟吡氧乙酸或双氟磺草胺方案。",
                    "节节麦等禾本科杂草可参考甲基二磺隆方案。"
                  ],
                  "cautions": [
                    "草龄大了再打，效果会明显下降。",
                    "药剂以当地登记和标签为准。"
                  ],
                  "leadDays": 4,
                  "keywords": ["冬前除草", "草相", "节节麦", "双氟磺草胺", "甲基二磺隆"]
                },
                {
                  "id": "wheat-action-spray-herbicide",
                  "name": "选合适天气喷除草剂",
                  "executionStandard": "日平均气温高于 10 摄氏度、无明显风，喷匀不重喷不漏喷。",
                  "steps": [
                    "无人机作业时亩用水可参考 15 到 30 升，自走喷杆可参考 30 到 40 升。",
                    "尽量在晴好微风天气作业，药液覆盖均匀。",
                    "对节节麦重的地块，重点盯住行间和边角。"
                  ],
                  "cautions": [
                    "不要在寒潮前后随意打药，容易出药害。",
                    "对敏感品种先小范围试喷更稳妥。"
                  ],
                  "leadDays": 1,
                  "keywords": ["除草剂", "喷药", "无人机", "药害", "杂草"]
                }
              ]
            },
            {
              "id": "wheat-overwinter-water",
              "name": "冬灌与冻害预防",
              "goal": "稳住墒情和根系，减少越冬死苗和早春弱苗。",
              "actions": [
                {
                  "id": "wheat-action-winter-irrigation",
                  "name": "昼消夜冻时浇越冬水",
                  "executionStandard": "麦垄不被漫过，浇后土壤沉实但不积水。",
                  "steps": [
                    "看墒情和天气，在昼消夜冻、日均约 3 摄氏度时安排冬灌。",
                    "亩灌水量可参考 30 到 40 立方米。",
                    "浇后回头查低洼处，及时排掉明水。"
                  ],
                  "cautions": [
                    "黏重地或排水差地块不要大水漫灌。",
                    "极端低温来前不要临时大水猛浇。"
                  ],
                  "leadDays": 2,
                  "keywords": ["冬灌", "越冬水", "冻害", "墒情", "排水"]
                }
              ]
            }
          ]
        },
        {
          "id": "wheat-greenup-jointing",
          "name": "返青拔节期",
          "offsetStartDays": 121,
          "offsetEndDays": 190,
          "milestones": [
            {
              "id": "wheat-fertilizer-water",
              "name": "拔节肥水管理",
              "goal": "稳住群体长势，促小花分化，少出无效穗。",
              "actions": [
                {
                  "id": "wheat-action-jointing-check",
                  "name": "先看苗情，再定追肥节奏",
                  "executionStandard": "能判断群体是否偏旺、偏弱或正常，再决定肥水轻重。",
                  "steps": [
                    "重点看一二类苗比例、分蘖保留情况和根系活力。",
                    "偏旺田控制肥水节奏，偏弱田适当提早和补强。",
                    "把需要追肥的地块先排好顺序，避免错过拔节关键窗。"
                  ],
                  "cautions": [
                    "不要只看颜色下结论，要结合株高和分蘖数。",
                    "旺苗田肥水过猛容易后期倒伏。"
                  ],
                  "leadDays": 5,
                  "keywords": ["返青", "拔节", "苗情", "分蘖", "追肥"]
                },
                {
                  "id": "wheat-action-apply-jointing-fertilizer",
                  "name": "在关键节间期追拔节肥",
                  "executionStandard": "第一节间定型、第二节间伸长时追到位，肥后群体长势均匀。",
                  "steps": [
                    "可参考每亩追施尿素 10 到 15 公斤。",
                    "追肥后如果墒情不足，配合浇拔节水。",
                    "施后观察 5 到 7 天，确认叶色和长势变化。"
                  ],
                  "cautions": [
                    "过早追肥容易造成群体过旺。",
                    "大风降温前不宜匆忙浇水追肥。"
                  ],
                  "leadDays": 1,
                  "keywords": ["拔节肥", "尿素", "追肥", "拔节水", "节间"]
                }
              ]
            },
            {
              "id": "wheat-stem-base-disease",
              "name": "纹枯病与茎基腐病防治",
              "goal": "把基部病害压住，给后期抗倒伏和灌浆留空间。",
              "actions": [
                {
                  "id": "wheat-action-scout-stem-base",
                  "name": "下田查看基部病斑和倒伏风险",
                  "executionStandard": "能发现基部病斑、叶鞘褐变和局部倒伏隐患，并排出先治地块。",
                  "steps": [
                    "扒开麦丛看基部和叶鞘，确认是否有纹枯病云纹斑或茎基腐褐变。",
                    "把前茬秸秆多、群体偏大、地势低洼的地块优先列出来。",
                    "把观察结果顺手记到 FarmerNote，方便后续回看。"
                  ],
                  "cautions": [
                    "不要只看叶片，很多基部病害容易漏掉。",
                    "病害和缺肥黄化要分开判断。"
                  ],
                  "leadDays": 3,
                  "keywords": ["纹枯病", "茎基腐病", "基部病害", "倒伏", "巡田"]
                },
                {
                  "id": "wheat-action-spray-stem-base",
                  "name": "把药打到植株基部",
                  "executionStandard": "药液能打到植株基部，重点田块覆盖完整。",
                  "steps": [
                    "可参考 18.7% 丙环·嘧菌酯或 24% 噻呋酰胺等登记药剂。",
                    "亩用水量可参考 40 到 50 升，重点保证下部着药。",
                    "喷后继续盯天气和病情，必要时准备二次防治。"
                  ],
                  "cautions": [
                    "喷头角度太高会只打到上部叶片。",
                    "病情明显加重时不要拖到抽穗期再处理。"
                  ],
                  "leadDays": 1,
                  "keywords": ["丙环", "嘧菌酯", "噻呋酰胺", "喷药", "基部"]
                }
              ]
            }
          ]
        },
        {
          "id": "wheat-heading-flowering",
          "name": "抽穗扬花期",
          "offsetStartDays": 191,
          "offsetEndDays": 220,
          "milestones": [
            {
              "id": "wheat-fhb",
              "name": "赤霉病防控",
              "goal": "抢住见花窗口，把赤霉病和毒素超标风险压下去。",
              "actions": [
                {
                  "id": "wheat-action-watch-heading",
                  "name": "盯见花率和天气预报",
                  "executionStandard": "能及时判断见花 5% 到 10% 的窗口，并提前安排药、人、机。",
                  "steps": [
                    "从抽穗开始天天看穗部进度，见花率到 5% 到 10% 及时准备首喷。",
                    "重点关注连阴雨、降雨前后和田间湿度。",
                    "提前和无人机或地面机手确认作业时间。"
                  ],
                  "cautions": [
                    "赤霉病防控关键在抢窗口，不要等全面开花再动。",
                    "雨前能打尽量雨前打，雨后要及时补喷。"
                  ],
                  "leadDays": 3,
                  "keywords": ["赤霉病", "见花率", "扬花", "天气", "预约无人机"]
                },
                {
                  "id": "wheat-action-spray-fhb",
                  "name": "见花就打，必要时补喷",
                  "executionStandard": "穗部和中上部叶片覆盖均匀，连阴雨年份能按需要补防。",
                  "steps": [
                    "可参考 40% 丙硫唑·戊唑醇悬浮剂 30 到 40 毫升每亩等登记方案。",
                    "无人机亩药液不少于 1.5 升，地面机械不少于 30 升。",
                    "遇到持续阴雨或病害高风险年份，按技术指导准备二次防治。"
                  ],
                  "cautions": [
                    "不要用过低药液量图快，容易防效不稳。",
                    "混配前注意药剂安全间隔和兼容性。"
                  ],
                  "leadDays": 0,
                  "keywords": ["丙硫唑", "戊唑醇", "赤霉病", "补喷", "药液量"]
                }
              ]
            }
          ]
        },
        {
          "id": "wheat-grain-fill",
          "name": "灌浆至成熟期",
          "offsetStartDays": 221,
          "offsetEndDays": 260,
          "milestones": [
            {
              "id": "wheat-one-spray-three-prevention",
              "name": "一喷三防",
              "goal": "稳灌浆、防早衰、减病虫，尽量把千粒重保住。",
              "actions": [
                {
                  "id": "wheat-action-plan-one-spray",
                  "name": "根据田间情况配一喷三防方案",
                  "executionStandard": "能明确杀虫、杀菌和营养三部分是否都需要，以及施药时间。",
                  "steps": [
                    "看蚜虫、白粉、锈病和叶片早衰情况，决定配方重点。",
                    "常见思路是杀虫剂 + 杀菌剂 + 磷酸二氢钾等叶面营养。",
                    "尽量把作业安排在下午 4 点以后。"
                  ],
                  "cautions": [
                    "不是所有地块都一模一样，先看虫病再定配方。",
                    "高温时段喷施容易影响效果。"
                  ],
                  "leadDays": 3,
                  "keywords": ["一喷三防", "蚜虫", "锈病", "磷酸二氢钾", "叶面肥"]
                },
                {
                  "id": "wheat-action-do-one-spray",
                  "name": "按药液量要求完成综合喷施",
                  "executionStandard": "药液量和覆盖达到要求，喷后叶片功能期延长、虫病压力可控。",
                  "steps": [
                    "可参考 10% 吡虫啉 20 克、43% 戊唑醇 15 毫升、99% 磷酸二氢钾 100 克每亩的思路。",
                    "无人机亩药液量可参考 1.5 到 2 升。",
                    "喷后持续观察灌浆期虫病和早衰情况。"
                  ],
                  "cautions": [
                    "药液量不足时，叶片和穗部覆盖会明显变差。",
                    "混配顺序和溶解性要提前确认。"
                  ],
                  "leadDays": 1,
                  "keywords": ["吡虫啉", "戊唑醇", "磷酸二氢钾", "喷施", "灌浆"]
                }
              ]
            },
            {
              "id": "wheat-harvest",
              "name": "收获与减损",
              "goal": "在适熟期机收，尽量把落粒和机械损失降下来。",
              "actions": [
                {
                  "id": "wheat-action-check-harvest-window",
                  "name": "看成熟度，定收获窗口",
                  "executionStandard": "籽粒已硬化、进入蜡熟末期，地块成熟度和天气都适合开镰。",
                  "steps": [
                    "抽样看籽粒硬度和含水情况，接近 20% 含水时重点准备机收。",
                    "同时看天气，避开连阴雨和大风倒伏风险。",
                    "提前联系机手和运粮安排。"
                  ],
                  "cautions": [
                    "不要因为赶时间过早抢收，影响产量和品质。",
                    "阴雨将至时也不要拖得太晚。"
                  ],
                  "leadDays": 4,
                  "keywords": ["机收", "蜡熟", "成熟度", "含水率", "收获窗口"]
                },
                {
                  "id": "wheat-action-harvest-loss-control",
                  "name": "收割时盯住机械损失",
                  "executionStandard": "收割机转速和速度匹配，落粒损失控制在可接受范围。",
                  "steps": [
                    "根据品种和地块情况调整滚筒转速、风量和行进速度。",
                    "下车看地面落粒、夹带和破碎情况，边收边调。",
                    "收后把损失和实际产量记到 FarmerNote。"
                  ],
                  "cautions": [
                    "倒伏田和潮湿田更要慢下来。",
                    "不要只顾赶进度不回头查损失。"
                  ],
                  "leadDays": 0,
                  "keywords": ["联合收割", "损失率", "落粒", "机收", "产量记录"]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "cropCode": "corn",
      "cropName": "玉米",
      "anchorLabel": "播种日期",
      "stages": [
        {
          "id": "corn-sowing-seedling",
          "name": "播种与出苗期",
          "offsetStartDays": 0,
          "offsetEndDays": 12,
          "milestones": [
            {
              "id": "corn-sowing",
              "name": "抢墒播种与一播全苗",
              "goal": "抓住适播期和墒情，确保苗齐、苗匀、苗壮。",
              "actions": [
                {
                  "id": "corn-action-prepare-sowing",
                  "name": "播前看墒情、品种和密度",
                  "executionStandard": "能明确播种时间、目标密度和所用品种，不盲目下种。",
                  "steps": [
                    "结合当地夏玉米茬口，确认是否需要抢时抢墒播种。",
                    "根据品种熟期和地力，确定目标密度。",
                    "把缺苗风险大的地块单独记出来，便于后续查苗。"
                  ],
                  "cautions": [
                    "高产地和瘠薄地密度不能一个标准。",
                    "播期拖太久容易影响全季热量积累。"
                  ],
                  "leadDays": 4,
                  "keywords": ["玉米播种", "墒情", "密度", "品种", "适播期"]
                },
                {
                  "id": "corn-action-seed-treatment",
                  "name": "包衣拌种并机播控深",
                  "executionStandard": "种子包衣完整、播深一致，出苗整齐。",
                  "steps": [
                    "优先使用正规包衣种子，必要时补做种子处理。",
                    "机播时把播深尽量控在 3 到 5 厘米，覆土镇压到位。",
                    "播后及时查看行距、漏播和断垄。"
                  ],
                  "cautions": [
                    "地太湿时强行播种容易板结出苗差。",
                    "播得过深会导致出苗慢、弱苗多。"
                  ],
                  "leadDays": 1,
                  "keywords": ["包衣种子", "机播", "播深", "出苗", "断垄"]
                }
              ]
            },
            {
              "id": "corn-seedling-check",
              "name": "查苗补苗",
              "goal": "尽快把缺苗断垄找出来，稳住群体基础。",
              "actions": [
                {
                  "id": "corn-action-check-seedlings",
                  "name": "出苗后查缺苗和病虫口",
                  "executionStandard": "能明确缺苗位置、病虫压力和是否需要补种补栽。",
                  "steps": [
                    "出苗后沿行查看整齐度，重点盯边角和低洼处。",
                    "记录断垄长度、缺苗比例和苗弱原因。",
                    "发现地下害虫或苗期病害时，先拍照记下来再定补救方案。"
                  ],
                  "cautions": [
                    "不要只站地头看，缺苗常出在局部地段。",
                    "补苗前先判断原因，避免重复犯同样问题。"
                  ],
                  "leadDays": 0,
                  "keywords": ["查苗", "补苗", "断垄", "地下害虫", "苗情"]
                }
              ]
            }
          ]
        },
        {
          "id": "corn-vegetative",
          "name": "苗期至拔节/喇叭口期",
          "offsetStartDays": 13,
          "offsetEndDays": 55,
          "milestones": [
            {
              "id": "corn-seedling-management",
              "name": "苗期管理与除草",
              "goal": "稳苗壮苗，尽量在早期把草害和弱苗问题处理掉。",
              "actions": [
                {
                  "id": "corn-action-scout-seedling",
                  "name": "看苗情，定是否蹲苗或促苗",
                  "executionStandard": "能分清弱苗、旺苗和受渍受旱苗，并决定下一步管理重点。",
                  "steps": [
                    "查看叶色、株高、根系和整齐度，判断苗势。",
                    "对弱苗田优先解决水肥和草害问题。",
                    "把有明显差苗的地块记成重点复查对象。"
                  ],
                  "cautions": [
                    "不要见苗小就猛追肥，先看土壤水分和根系。",
                    "旺长地块要防后期倒伏。"
                  ],
                  "leadDays": 3,
                  "keywords": ["苗情", "弱苗", "旺苗", "蹲苗", "复查"]
                },
                {
                  "id": "corn-action-early-weed-control",
                  "name": "在草小期完成除草",
                  "executionStandard": "杂草在小苗期被压住，行间行内明显干净。",
                  "steps": [
                    "根据草相选择苗后除草剂，尽量在草小苗小阶段完成。",
                    "施药时注意温度、风力和玉米叶龄。",
                    "喷后继续看药效和是否有药害。"
                  ],
                  "cautions": [
                    "高温、低温或大风天气不要勉强施药。",
                    "不同品种和叶龄对药剂敏感性不同。"
                  ],
                  "leadDays": 1,
                  "keywords": ["苗后除草", "草相", "药害", "叶龄", "喷药"]
                }
              ]
            },
            {
              "id": "corn-jointing-whorl",
              "name": "拔节与喇叭口肥水病虫管理",
              "goal": "保住大喇叭口前后的营养供应，为穗大粒多打底。",
              "actions": [
                {
                  "id": "corn-action-topdress",
                  "name": "在大喇叭口前后追肥",
                  "executionStandard": "肥料下到根旁、长势均匀，叶片功能保持良好。",
                  "steps": [
                    "根据苗情和地力，在拔节到大喇叭口期安排追肥。",
                    "可结合浇水或雨前施肥，提高利用率。",
                    "追后继续观察叶色和长势变化。"
                  ],
                  "cautions": [
                    "偏旺田不要盲目加大氮肥。",
                    "干旱条件下表施后长期不下雨，肥效会打折。"
                  ],
                  "leadDays": 2,
                  "keywords": ["喇叭口肥", "追肥", "拔节", "大喇叭口", "叶色"]
                },
                {
                  "id": "corn-action-whorl-pest-check",
                  "name": "重点查玉米螟、黏虫和叶斑病",
                  "executionStandard": "能发现心叶危害、虫口上升和病斑扩展，及时排进防治计划。",
                  "steps": [
                    "扒开喇叭口和心叶看虫粪、蛀孔和新鲜危害。",
                    "同时查看中下部叶片是否出现病斑扩展。",
                    "达到防治指标时尽快安排药械。"
                  ],
                  "cautions": [
                    "虫害发展快时不要等大片受害才处理。",
                    "注意区分机械伤、缺肥斑和病斑。"
                  ],
                  "leadDays": 2,
                  "keywords": ["玉米螟", "黏虫", "叶斑病", "喇叭口", "防治指标"]
                }
              ]
            }
          ]
        },
        {
          "id": "corn-flowering",
          "name": "抽雄吐丝期",
          "offsetStartDays": 56,
          "offsetEndDays": 85,
          "milestones": [
            {
              "id": "corn-pollination-water",
              "name": "授粉与高温干旱风险管理",
              "goal": "保授粉、保结实，尽量减少空秆和秃尖。",
              "actions": [
                {
                  "id": "corn-action-watch-flowering",
                  "name": "盯抽雄吐丝是否同步",
                  "executionStandard": "能判断田间吐丝是否顺畅、是否有高温干旱影响授粉的风险。",
                  "steps": [
                    "重点看抽雄和吐丝是否基本同步，是否有迟吐丝地块。",
                    "遇到高温干旱天气，优先考虑保水。",
                    "把明显弱株和缺行区做成后续产量回看样本。"
                  ],
                  "cautions": [
                    "吐丝期对水分最敏感，不要等卷叶严重再补救。",
                    "边角弱地要单独看，不要只看整田平均状态。"
                  ],
                  "leadDays": 3,
                  "keywords": ["抽雄", "吐丝", "授粉", "高温", "干旱"]
                },
                {
                  "id": "corn-action-irrigate-flowering",
                  "name": "高温干旱时及时保水",
                  "executionStandard": "土壤水分能支撑授粉结实，植株不持续卷叶萎蔫。",
                  "steps": [
                    "如果持续高温干旱，尽快安排灌水或保墒措施。",
                    "灌后继续看午后卷叶和夜间恢复情况。",
                    "把保水效果记到 FarmerNote，方便后续比较。"
                  ],
                  "cautions": [
                    "积水地块要先解决排水，避免根系受损。",
                    "不要忽略沙土地和岗地的失墒速度。"
                  ],
                  "leadDays": 1,
                  "keywords": ["灌水", "保墒", "卷叶", "授粉期", "高温干旱"]
                }
              ]
            },
            {
              "id": "corn-ear-pests",
              "name": "穗期病虫防控",
              "goal": "把穗部病虫危害压在关键窗口内，减少结实损失。",
              "actions": [
                {
                  "id": "corn-action-ear-pest-control",
                  "name": "根据虫病监测安排穗期防治",
                  "executionStandard": "关键病虫在高发前后得到处理，穗部和上部叶片受害可控。",
                  "steps": [
                    "结合监测结果，关注玉米螟、棉铃虫、南方锈病和叶斑类病害。",
                    "达到防治阈值后及时组织喷施。",
                    "注意穗部和上部功能叶的覆盖质量。"
                  ],
                  "cautions": [
                    "用药以当地登记和预警为准。",
                    "不要忽略风口、边地和灯下虫口高的区域。"
                  ],
                  "leadDays": 2,
                  "keywords": ["穗期病虫", "玉米螟", "南方锈病", "叶斑病", "阈值"]
                }
              ]
            }
          ]
        },
        {
          "id": "corn-grain-fill-harvest",
          "name": "灌浆至成熟收获期",
          "offsetStartDays": 86,
          "offsetEndDays": 125,
          "milestones": [
            {
              "id": "corn-grain-fill",
              "name": "灌浆保叶与防倒伏",
              "goal": "尽量延长功能叶寿命，减少早衰、倒伏和烂穗损失。",
              "actions": [
                {
                  "id": "corn-action-watch-fill",
                  "name": "看叶片早衰、倒伏和病害扩展",
                  "executionStandard": "能及时发现早衰、倒伏风险和后期病害加重地块。",
                  "steps": [
                    "重点看上部叶片是否提前黄化，茎秆是否发软。",
                    "台风、大风或暴雨后及时进田查倒伏。",
                    "把问题地块列成收获优先顺序。"
                  ],
                  "cautions": [
                    "后期早衰和根系问题常常一起出现，要综合判断。",
                    "倒伏后不要长时间不管，容易加大机收损失。"
                  ],
                  "leadDays": 3,
                  "keywords": ["灌浆", "早衰", "倒伏", "病害", "复查"]
                }
              ]
            },
            {
              "id": "corn-harvest",
              "name": "适期收获与减损",
              "goal": "在成熟适宜时收获，兼顾籽粒品质、机收效率和田间损失。",
              "actions": [
                {
                  "id": "corn-action-schedule-harvest",
                  "name": "按成熟度和天气安排机收",
                  "executionStandard": "能明确先收后收地块，机收窗口不被动。",
                  "steps": [
                    "看籽粒乳线、苞叶和黑层形成情况，判断成熟度。",
                    "结合天气和倒伏风险排出收获顺序。",
                    "提前联系机手、烘干和运输。"
                  ],
                  "cautions": [
                    "成熟不匀地块要避免一刀切。",
                    "连阴雨前后的收获计划要留出机动。"
                  ],
                  "leadDays": 4,
                  "keywords": ["机收", "成熟度", "黑层", "烘干", "运输"]
                },
                {
                  "id": "corn-action-harvest-loss",
                  "name": "收获时盯住破碎和掉粒",
                  "executionStandard": "机收参数匹配，掉穗、掉粒和破碎率处在可接受范围。",
                  "steps": [
                    "根据含水率和品种调整机收速度、滚筒和清选参数。",
                    "边收边查地面掉粒、破碎和夹带情况。",
                    "收后把产量和损失情况记到 FarmerNote。"
                  ],
                  "cautions": [
                    "含水高时盲目快收容易破碎重。",
                    "倒伏田一定要单独调机。"
                  ],
                  "leadDays": 0,
                  "keywords": ["掉粒", "破碎率", "机收参数", "产量", "减损"]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
