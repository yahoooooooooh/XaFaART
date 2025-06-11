// js/data-definitions.js

// ===== 核心修改：基于新教材目录更新 PERIOD_OPTIONS =====
// 这个对象现在定义了每个“章”下面的所有“节”。
const PERIOD_OPTIONS = {
    "chapter_0": [
        { "id": "ch0_sec1", "name": "一、中国美术史的研究对象", "description": "明确中国美术史的研究范围与核心内容。" },
        { "id": "ch0_sec2", "name": "二、中国美术史的总体脉络", "description": "梳理中国美术发展的宏观线索与阶段特征。" },
        { "id": "ch0_sec3", "name": "三、中国美术史研究的方法", "description": "介绍研究中国美术史的主要理论与方法论。" }
    ],
    "chapter_1": [
        { "id": "ch1_sec0", "name": "概述", "description": "史前至先秦时期美术的总体介绍。" },
        { "id": "ch1_sec1", "name": "第一节 旧石器时代的美术", "description": "探讨旧石器时代古人类的早期视觉创造与美术起源。" },
        { "id": "ch1_sec2", "name": "第二节 新石器时代的美术", "description": "分析新石器时代定居农业社会中的聚落、器物与礼仪艺术。" },
        { "id": "ch1_sec3", "name": "第三节 夏商时期的美术", "description": "研究夏商王朝的都城、建筑、青铜器、玉器与文字艺术。" },
        { "id": "ch1_sec4", "name": "第四节 两周时期的美术", "description": "探索两周时期的城市、建筑、青铜器、玉器和漆器艺术。" },
        { "id": "ch1_sec5", "name": "第五节 先秦时期周边地区的美术", "description": "关注同时期周边地区（如南方、西部）的独特美术面貌。" }
    ],
    "chapter_2": [
        { "id": "ch2_sec0", "name": "概述", "description": "秦汉大一统帝国美术的总体介绍。" },
        { "id": "ch2_sec1", "name": "第一节 城市与物质文化", "description": "探索秦汉时期的城市、建筑、景观、器具、织物与刻石艺术。" },
        { "id": "ch2_sec2", "name": "第二节 墓葬美术", "description": "以帝陵、壁画、画像石、画像砖为核心，解读秦汉的墓葬视觉文化。" },
        { "id": "ch2_sec3", "name": "第三节 秦汉时期的美术交流", "description": "分析秦汉与外部世界，特别是欧亚大陆的美术互动与影响。" }
    ],
    "chapter_3": [
        { "id": "ch3_sec0", "name": "概述", "description": "三国两晋南北朝时期美术的总体介绍。" },
        { "id": "ch3_sec1", "name": "第一节 北方城市的发展与美术的变化", "description": "探讨北方在动荡时期的都城、建筑、器物与墓葬美术新格局。" },
        { "id": "ch3_sec2", "name": "第二节 东吴、东晋和南朝的艺术", "description": "聚焦南方地区青瓷、贵族政治影响下的书画艺术及理论发展。" },
        { "id": "ch3_sec3", "name": "第三节 宗教美术的兴盛", "description": "研究佛教与道教在全国范围内的传播及其对美术的深刻影响。" },
        { "id": "ch3_sec4", "name": "第四节 中外美术交流", "description": "以入华粟特人为切入点，探讨陆上与海上交通带来的美术交流。" }
    ],
    "chapter_4": [
        { "id": "ch4_sec0", "name": "概述", "description": "隋唐盛世美术的总体介绍。" },
        { "id": "ch4_sec1", "name": "第一节 都城与墓葬", "description": "分析隋唐两京的宏伟规制及其对周边国家的影响，以及辉煌的墓葬美术。" },
        { "id": "ch4_sec2", "name": "第二节 佛教美术", "description": "探讨隋唐时期佛教寺院、名家样式、石窟寺的发展与创新。" },
        { "id": "ch4_sec3", "name": "第三节 世俗社会中的美术", "description": "涵盖建筑、园林、绘画、书法、理论及日常器用的全面突破。" },
        { "id": "ch4_sec4", "name": "第四节 民族关系与美术交流", "description": "研究隋唐与周边民族及通过丝绸之路展开的广泛美术交流。" }
    ],
    "chapter_5": [
        { "id": "ch5_sec0", "name": "概述", "description": "五代辽宋金元时期美术的总体介绍。" },
        { "id": "ch5_sec1", "name": "第一节 五代两宋的国家、皇权与美术", "description": "探讨皇权对美术的塑造，山水画范式的建立，以及宫廷画院的创作。" },
        { "id": "ch5_sec2", "name": "第二节 两宋文人士大夫与美术", "description": "研究文官政治背景下，文人的艺术活动、金石学、书法与墨戏。" },
        { "id": "ch5_sec3", "name": "第三节 辽夏金元的都城、建筑与多民族美术", "description": "关注北方民族政权的都城、建筑、文化景观与马背民族的物质文化。" },
        { "id": "ch5_sec4", "name": "第四节 元代的宫廷趣味与文人士大夫美术", "description": "分析元代宫廷、遗民、禅僧的美术创作，以及复古与革新的潮流。" },
        { "id": "ch5_sec5", "name": "第五节 宗教美术", "description": "梳理五代至元代汉传佛教、藏传佛教等宗教美术的发展演变。" },
        { "id": "ch5_sec6", "name": "第六节 墓葬美术与世俗社会", "description": "考察五代至元代各具特色的墓葬美术形式与内容。" },
        { "id": "ch5_sec7", "name": "第七节 宋元工艺美术与美术品的流播", "description": "探讨宋元时期辉煌的工艺美术成就与美术品的商业贸易和文化交流。" }
    ],
    "chapter_6": [
        { "id": "ch6_sec0", "name": "概述", "description": "明清时期美术的总体介绍。" },
        { "id": "ch6_sec1", "name": "第一节 复兴的宫廷美术", "description": "研究明清宫廷艺术、都城宫殿、园林、陵寝及皇家美术趣味。" },
        { "id": "ch6_sec2", "name": "第二节 南方文人集团的兴起", "description": "以江南地区为中心，探讨绘画、书法、园林、收藏与文人生活趣味。" },
        { "id": "ch6_sec3", "name": "第三节 地域特色和个人特色", "description": "分析明清画派的地域性、“南北宗论”影响、个性化风潮与碑学兴起。" },
        { "id": "ch6_sec4", "name": "第四节 明清时期的视觉文化", "description": "涵盖地方胜景、女性艺术家、印刷文化与民众美术等多元视觉现象。" },
        { "id": "ch6_sec5", "name": "第五节 美术品的流通与市场", "description": "探讨书画古玩的流通、商业化、私人收藏、赞助与作伪现象。" },
        { "id": "ch6_sec6", "name": "第六节 明清时期的美术交流", "description": "研究明清时期中外美术的相互观察、影响与融合。" },
        { "id": "ch6_sec7", "name": "第七节 宗教美术与墓葬美术", "description": "考察明清时期汉藏佛教、道教、伊斯兰教美术及墓葬艺术的发展。" }
    ],
    "chapter_7": [
        { "id": "ch7_sec0", "name": "概述", "description": "中国近现代美术的总体介绍。" },
        { "id": "ch7_sec1", "name": "第一节 近代书学与画学的演进变革", "description": "分析碑学潮流、国画改良论争及近代海派、京派、岭南画派的发展。" },
        { "id": "ch7_sec2", "name": "第二节 西洋画的近代传入与美术出版的更新", "description": "探讨西画的传入途径及其对中国美术的影响，以及美术出版的现代化。" },
        { "id": "ch7_sec3", "name": "第三节 留学生与现代美术教育的兴办", "description": "研究新式美术教育的建立、美术留学潮及徐悲鸿等教育家的贡献。" },
        { "id": "ch7_sec4", "name": "第四节 国内外对“中国美术”的认识建构", "description": "从考古、展览、收藏、研究等角度看中外对中国美术概念的建构。" },
        { "id": "ch7_sec5", "name": "第五节 外来文艺思潮传播与左翼美术运动发展", "description": "探讨马克思主义文艺理论、西方现代主义的传播、论战与左翼美术实践。" },
        { "id": "ch7_sec6", "name": "第六节 走出象牙塔的抗战进步美术与革命美术运动的高涨", "description": "研究抗战美术的社会功能、延安文艺座谈会讲话及新中国美术体制的建立。" }
    ]
};

// ===== 核心修改：基于新教材目录更新 DEFAULT_INITIAL_QUIZ_DATA =====
// 顶级键现在是每个“章”的ID，内部的 periods 对应“节”
const DEFAULT_INITIAL_QUIZ_DATA = {
    "chapter_0": {
        id: "chapter_0",
        name: "绪论",
        description: "中国美术史的研究对象、总体脉络与研究方法。",
        icon: "🧭",
        periods: { // “节”作为“时期” (二级目录)
            "ch0_sec1": { id: "ch0_sec1", name: "一、中国美术史的研究对象", description: "明确中国美术史的研究范围与核心内容。", icon: "🎯", quizzes: [] },
            "ch0_sec2": { id: "ch0_sec2", name: "二、中国美术史的总体脉络", description: "梳理中国美术发展的宏观线索与阶段特征。", icon: "🗺️", quizzes: [] },
            "ch0_sec3": { id: "ch0_sec3", name: "三、中国美术史研究的方法", description: "介绍研究中国美术史的主要理论与方法论。", icon: "🔬", quizzes: [] }
        }
    },
    "chapter_1": {
        id: "chapter_1",
        name: "第一章 史前至先秦时期的美术",
        description: "从旧石器时代的美术起源到先秦时期各区域的艺术创造。",
        icon: "🗿",
        periods: {
            "ch1_sec0": { id: "ch1_sec0", name: "概述", description: "史前至先秦时期美术的总体介绍。", icon: "📜", quizzes: [] },
            "ch1_sec1": { id: "ch1_sec1", name: "第一节 旧石器时代的美术", description: "探讨旧石器时代古人类的早期视觉创造与美术起源。", icon: "🦴", quizzes: [] },
            "ch1_sec2": { id: "ch1_sec2", name: "第二节 新石器时代的美术", description: "分析新石器时代定居农业社会中的聚落、器物与礼仪艺术。", icon: "🏺", quizzes: [] },
            "ch1_sec3": { id: "ch1_sec3", name: "第三节 夏商时期的美术", description: "研究夏商王朝的都城、建筑、青铜器、玉器与文字艺术。", icon: "鼎", quizzes: [] },
            "ch1_sec4": { id: "ch1_sec4", name: "第四节 两周时期的美术", description: "探索两周时期的城市、建筑、青铜器、玉器和漆器艺术。", icon: "🔔", quizzes: [] },
            "ch1_sec5": { id: "ch1_sec5", name: "第五节 先秦时期周边地区的美术", description: "关注同时期周边地区（如南方、西部）的独特美术面貌。", icon: "🌍", quizzes: [] }
        }
    },
    "chapter_2": {
        id: "chapter_2",
        name: "第二章 秦汉时期的美术",
        description: "大一统帝国背景下的城市、物质文化、墓葬美术与中外交流。",
        icon: "🏛️",
        periods: {
            "ch2_sec0": { id: "ch2_sec0", name: "概述", description: "秦汉大一统帝国美术的总体介绍。", icon: "📜", quizzes: [] },
            "ch2_sec1": { id: "ch2_sec1", name: "第一节 城市与物质文化", description: "探索秦汉时期的城市、建筑、景观、器具、织物与刻石艺术。", icon: "🌆", quizzes: [] },
            "ch2_sec2": { id: "ch2_sec2", name: "第二节 墓葬美术", description: "以帝陵、壁画、画像石、画像砖为核心，解读秦汉的墓葬视觉文化。", icon: "🖼️", quizzes: [] },
            "ch2_sec3": { id: "ch2_sec3", name: "第三节 秦汉时期的美术交流", description: "分析秦汉与外部世界，特别是欧亚大陆的美术互动与影响。", icon: "🔄", quizzes: [] }
        }
    },
    // 我将为您补全所有章节，请直接复制使用
    "chapter_3": {
        id: "chapter_3",
        name: "第三章 三国两晋南北朝时期的美术",
        description: "分裂与融合时代的艺术演变，佛教艺术的兴盛与文人书画的自觉。",
        icon: "⚔️",
        periods: {
            "ch3_sec0": { id: "ch3_sec0", name: "概述", description: "三国两晋南北朝时期美术的总体介绍。", icon: "📜", quizzes: [] },
            "ch3_sec1": { id: "ch3_sec1", name: "第一节 北方城市的发展与美术的变化", description: "探讨北方在动荡时期的都城、建筑、器物与墓葬美术新格局。", icon: "🏰", quizzes: [] },
            "ch3_sec2": { id: "ch3_sec2", name: "第二节 东吴、东晋和南朝的艺术", description: "聚焦南方地区青瓷、贵族政治影响下的书画艺术及理论发展。", icon: "🖌️", quizzes: [] },
            "ch3_sec3": { id: "ch3_sec3", name: "第三节 宗教美术的兴盛", description: "研究佛教与道教在全国范围内的传播及其对美术的深刻影响。", icon: "🙏", quizzes: [] },
            "ch3_sec4": { id: "ch3_sec4", name: "第四节 中外美术交流", description: "以入华粟特人为切入点，探讨陆上与海上交通带来的美术交流。", icon: " Silk ", quizzes: [] }
        }
    },
    "chapter_4": {
        id: "chapter_4",
        name: "第四章 隋唐时期的美术",
        description: "雍容大度的盛世气象，全面繁荣的艺术成就与广泛的国际交流。",
        icon: "🌸",
        periods: {
            "ch4_sec0": { id: "ch4_sec0", name: "概述", description: "隋唐盛世美术的总体介绍。", icon: "📜", quizzes: [] },
            "ch4_sec1": { id: "ch4_sec1", name: "第一节 都城与墓葬", description: "分析隋唐两京的宏伟规制及其对周边国家的影响，以及辉煌的墓葬美术。", icon: "🏯", quizzes: [] },
            "ch4_sec2": { id: "ch4_sec2", name: "第二节 佛教美术", description: "探讨隋唐时期佛教寺院、名家样式、石窟寺的发展与创新。", icon: "🛕", quizzes: [] },
            "ch4_sec3": { id: "ch4_sec3", name: "第三节 世俗社会中的美术", description: "涵盖建筑、园林、绘画、书法、理论及日常器用的全面突破。", icon: "🎨", quizzes: [] },
            "ch4_sec4": { id: "ch4_sec4", name: "第四节 民族关系与美术交流", description: "研究隋唐与周边民族及通过丝绸之路展开的广泛美术交流。", icon: "🐫", quizzes: [] }
        }
    },
    "chapter_5": {
        id: "chapter_5",
        name: "第五章 五代辽宋金元时期的美术",
        description: "承唐启明，多民族政权并立下的艺术高峰与多元发展。",
        icon: "🏞️",
        periods: {
            "ch5_sec0": { id: "ch5_sec0", name: "概述", description: "五代辽宋金元时期美术的总体介绍。", icon: "📜", quizzes: [] },
            "ch5_sec1": { id: "ch5_sec1", name: "第一节 五代两宋的国家、皇权与美术", description: "探讨皇权对美术的塑造，山水画范式的建立，以及宫廷画院的创作。", icon: "👑", quizzes: [] },
            "ch5_sec2": { id: "ch5_sec2", name: "第二节 两宋文人士大夫与美术", description: "研究文官政治背景下，文人的艺术活动、金石学、书法与墨戏。", icon: "👨‍🎨", quizzes: [] },
            "ch5_sec3": { id: "ch5_sec3", name: "第三节 辽夏金元的都城、建筑与多民族美术", description: "关注北方民族政权的都城、建筑、文化景观与马背民族的物质文化。", icon: "🐎", quizzes: [] },
            "ch5_sec4": { id: "ch5_sec4", name: "第四节 元代的宫廷趣味与文人士大夫美术", description: "分析元代宫廷、遗民、禅僧的美术创作，以及复古与革新的潮流。", icon: "🧘", quizzes: [] },
            "ch5_sec5": { id: "ch5_sec5", name: "第五节 宗教美术", description: "梳理五代至元代汉传佛教、藏传佛教等宗教美术的发展演变。", icon: "☸️", quizzes: [] },
            "ch5_sec6": { id: "ch5_sec6", name: "第六节 墓葬美术与世俗社会", description: "考察五代至元代各具特色的墓葬美术形式与内容。", icon: "⚰️", quizzes: [] },
            "ch5_sec7": { id: "ch5_sec7", name: "第七节 宋元工艺美术与美术品的流播", description: "探讨宋元时期辉煌的工艺美术成就与美术品的商业贸易和文化交流。", icon: "🏺", quizzes: [] }
        }
    },
    "chapter_6": {
        id: "chapter_6",
        name: "第六章 明清时期的美术",
        description: "封建社会晚期集大成的艺术，文人画、宫廷艺术与民间美术的繁荣。",
        icon: "🏮",
        periods: {
            "ch6_sec0": { id: "ch6_sec0", name: "概述", description: "明清时期美术的总体介绍。", icon: "📜", quizzes: [] },
            "ch6_sec1": { id: "ch6_sec1", name: "第一节 复兴的宫廷美术", description: "研究明清宫廷艺术、都城宫殿、园林、陵寝及皇家美术趣味。", icon: "🏰", quizzes: [] },
            "ch6_sec2": { id: "ch6_sec2", name: "第二节 南方文人集团的兴起", description: "以江南地区为中心，探讨绘画、书法、园林、收藏与文人生活趣味。", icon: "江南", quizzes: [] },
            "ch6_sec3": { id: "ch6_sec3", name: "第三节 地域特色和个人特色", description: "分析明清画派的地域性、“南北宗论”影响、个性化风潮与碑学兴起。", icon: "🗺️", quizzes: [] },
            "ch6_sec4": { id: "ch6_sec4", name: "第四节 明清时期的视觉文化", description: "涵盖地方胜景、女性艺术家、印刷文化与民众美术等多元视觉现象。", icon: "🖼️", quizzes: [] },
            "ch6_sec5": { id: "ch6_sec5", name: "第五节 美术品的流通与市场", description: "探讨书画古玩的流通、商业化、私人收藏、赞助与作伪现象。", icon: "💹", quizzes: [] },
            "ch6_sec6": { id: "ch6_sec6", name: "第六节 明清时期的美术交流", description: "研究明清时期中外美术的相互观察、影响与融合。", icon: "🌍", quizzes: [] },
            "ch6_sec7": { id: "ch6_sec7", name: "第七节 宗教美术与墓葬美术", description: "考察明清时期汉藏佛教、道教、伊斯兰教美术及墓葬艺术的发展。", icon: "🕌", quizzes: [] }
        }
    },
    "chapter_7": {
        id: "chapter_7",
        name: "第七章 中国近现代美术",
        description: "中西文化的碰撞与融合，传统艺术的变革与现代美术的建立。",
        icon: "🌟",
        periods: {
            "ch7_sec0": { id: "ch7_sec0", name: "概述", description: "中国近现代美术的总体介绍。", icon: "📜", quizzes: [] },
            "ch7_sec1": { id: "ch7_sec1", name: "第一节 近代书学与画学的演进变革", description: "分析碑学潮流、国画改良论争及近代海派、京派、岭南画派的发展。", icon: "✒️", quizzes: [] },
            "ch7_sec2": { id: "ch7_sec2", name: "第二节 西洋画的近代传入与美术出版的更新", description: "探讨西画的传入途径及其对中国美术的影响，以及美术出版的现代化。", icon: "📰", quizzes: [] },
            "ch7_sec3": { id: "ch7_sec3", name: "第三节 留学生与现代美术教育的兴办", description: "研究新式美术教育的建立、美术留学潮及徐悲鸿等教育家的贡献。", icon: "🎓", quizzes: [] },
            "ch7_sec4": { id: "ch7_sec4", name: "第四节 国内外对“中国美术”的认识建构", description: "从考古、展览、收藏、研究等角度看中外对中国美术概念的建构。", icon: "🌐", quizzes: [] },
            "ch7_sec5": { id: "ch7_sec5", name: "第五节 外来文艺思潮传播与左翼美术运动发展", description: "探讨马克思主义文艺理论、西方现代主义的传播、论战与左翼美术实践。", icon: "🚩", quizzes: [] },
            "ch7_sec6": { id: "ch7_sec6", name: "第六节 走出象牙塔的抗战进步美术与革命美术运动的高涨", description: "研究抗战美术的社会功能、延安文艺座谈会讲话及新中国美术体制的建立。", icon: "🔥", quizzes: [] }
        }
    }
};

// =======================================================
// ================    关键的修复代码    ================
// =======================================================
// 确保 AppConfig 对象存在，并将本文件定义的常量附加到它上面
window.AppConfig = window.AppConfig || {};
window.AppConfig.PERIOD_OPTIONS = PERIOD_OPTIONS;
window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA = DEFAULT_INITIAL_QUIZ_DATA;
// =======================================================
// ===================   修复结束   ====================
// =======================================================