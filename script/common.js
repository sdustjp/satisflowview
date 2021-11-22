
var LANG = "ja-jp";
var ICON_PATH = "image/icon/";

// 素材データ
var MATERIALS_DATA = [];

// 設備データ
var EQUIPMENTS_DATA = [];

// 名前データ
var NAMES_DATA = [];

jQuery(function () {

    // 素材データの読み込み
    $.getJSON("data/materials.json", function (data) {
        var jqObj;

        MATERIALS_DATA = data;

        MATERIALS_DATA.forEach(function (me) {

            //// 英語名称をIDから登録
            //me.name["en-us"] = me.id;

            // 自身を素材とする製品の登録
            MATERIALS_DATA.forEach(function (material) {
                if (material.id !== me.id) {
                    material.rawMaterials.forEach(function (rawMaterial) {
                        if (rawMaterial.id === me.id) {
                            me.products.push({"id": material.id});
                        }
                    });
                }
            });

            // ローカル名を取得
            me.localName = function () {
                return getLocalName(me.name, LANG);
            };

        });
        
        // 対象素材セレクタの内容セット
        jqObj = $("#selectTargetMaterial");
        MATERIALS_DATA.forEach(function (item) {
            jqObj.append("<option value=\"" + item.id + "\">" + item.id + "</option>");
        });

        // 対象素材セレクタ(アイコン)の内容セット
        jqObj = $("#materials");
        MATERIALS_DATA.forEach(function (item) {
            jqObj.append("<img class= \"materialChanger\" data-id=\"" + item.id + "\" src=\"" + ICON_PATH + item.icon + "\">")
        });

    });

    // 設備データの読み込み
    $.getJSON("data/equipments.json", function (data) {

        EQUIPMENTS_DATA = data;

        EQUIPMENTS_DATA.forEach(function (me) {

            //// 英語名称をIDから登録
            //me.name["en-us"] = me.id;

            // ローカル名を取得
            me.localName = function () {
                return getLocalName(me.name, LANG);
            };

        });
        
    });

    // 名称データの読み込み
    $.getJSON("data/names.json", function (data) {

        NAMES_DATA = data;

    });


    // 対象素材変更時
    $("#selectTargetMaterial").change(function (ev) {
        var id = $(ev.target).val();

        updateMaterialInfo(getMaterialData(id));

    });

    // 言語変更時
    $("#selectLanguage").change(function (ev) {
        var id = $("#selectTargetMaterial").val();

        LANG = $(ev.target).val();

        updateMaterialInfo(getMaterialData(id));

    });

    // クリックしたとき
    $("body").on("click", ".materialChanger", function (ev) {
        var id = $(ev.target).data("id");

        $("#selectTargetMaterial").val(id);

        updateMaterialInfo(getMaterialData(id));

    });

});

function updateMaterialInfo(target) {

    if (target !== undefined) {

        // 原材料ツリー表示
        viewRawMaterials(target, $("#rawMaterials > div.rawMaterialsList"));

        // 対象の素材情報表示
        viewMaterialInfo(target, $("#targetMaterialInfo"));

        // 生産物ツリー表示
        viewProducts(target, $("#products > div.productsList"));

    }
    else {
        $("#rawMaterials > div.rawMaterialsList").empty();

        $("#targetMaterialInfo").empty()
                                .append("<h2>???</h2>");
    }

}

// 素材情報の表示
function viewMaterialInfo(targetMat, container) {

    if (targetMat == undefined) return;

    var equipment = getEquipmentData(targetMat.productEquipment);

    container.empty();

    container.append("<h2>" + targetMat.localName() + "</h2>")
            .append("<p>" + targetMat.id + "</p>");
    
    container.append("<img src=\"" + ICON_PATH + targetMat.icon + "\">");

    container.append("<h3>材料:</h3>");

    targetMat.rawMaterials.forEach(function (el) {
        container.append("<p>" + getMaterialName(el.id) + " × " + el.count
         + " (" + calcConsumeRate(el.count, targetMat) + " /min)</p>");
    });

    container.append("<p>生産設備: " + getEquipmentName(equipment.id) + "</p>");

    container.append("<h3>生産物:</h3>");

    container.append("<p>" + targetMat.name[LANG] + " × " + targetMat.productCount + "</p>");
    
    container.append("<p>工作台: ハンマー × " + targetMat.handmadeTime + "</p>")
            .append("<p>製作時間: " + targetMat.craftingTime + " sec</p>")
            .append("<p>製作レート: " + calcProductRate(targetMat) + " /min</p>");

    // target.products.forEach(function (el) {
    //     container.append("<p>" + el.id + "</p>");    
    // });
        
}

// 原材料ツリーの表示
function viewRawMaterials(target, container) {

    if (target == undefined) return;

    container.empty();
    target.rawMaterials.forEach(function (el) {
        appendRawMaterials(
            el.id,
            el.count * $("#equipmentCount").val(),
            target,
            container);
    });

}

// 原材料ツリーの表示追加

// k[i+1] = k[i] * (m[i] / n[i+1]) * (t[i+1] / t[i])
// k: 必要な設備の数
// t: 製作時間
// m: 必要な素材の数
// n: 素材の生産数

// materialId = id (n[i+1], t[i+1]を得ることができる)
// materialCount = k[i] * m[i]

// rawMaterial = {id:materialId, count:materialCount}
// parentCraftingTime = t[i]
// container: jQueryObject

function appendRawMaterials(materialId, materialCount, parent, container) {

    var material = getMaterialData(materialId);

    if (material == undefined) return;

    var matNode = $("<div class=\"rawMaterialNode\"></div>");
    var matList = $("<div class=\"rawMaterialsList\"></div>");
    var matInfo = $("<div class=\"rawMaterialInfo\"></div>");

    var k = (materialCount * material.craftingTime) / (material.productCount * parent.craftingTime);

    // 材料すべてに対する処理
    material.rawMaterials.forEach(function (el) {

        // 素材情報に材料一覧を付加
        matInfo.append(
            $("<p>" + getMaterialName(el.id) + " × " + el.count
            + " (" + roundFormat(k * el.count * 60 / material.craftingTime) + " /min)</p>")
            .addClass("materialsSmall"));

        // 素材ツリーを構築
        appendRawMaterials(
            el.id,
            el.count * k,
            material,
            matList);
    });

    var needCount = (Math.round(materialCount * 100) / 100);

    matInfo.append("<p><i>" + getEquipmentName(material.productEquipment) + " × " + roundFormat(k) + "</i></p>")
    //    + targetMat.id + " x " + count + "<br>"
    .append("<img class= \"materialChanger\" data-id=\"" + material.id + "\" src=\"" + ICON_PATH + material.icon + "\">")
    .append(
        $("<p>" + getMaterialName(material.id) + " × " + material.productCount
        + " (" + roundFormat(k * material.productCount * 60 / material.craftingTime) + " /min)</p>")
        .addClass("productsSmall"))
//     .append("<p><small>(製作時間: " + material.craftingTime + " sec) × " + needCount + "</small></p>")
//     .append("<p><small>(製作レート: " + calcProductRate(material) + " / min) × " + needCount + "</small></p>");

//    .append("<p>" + (Math.round(targetMat.craftingTime * count * 100 / targetMat.productCount) / 100) + " sec</p>");
//           .append("<p>(" + (calcProductRate(targetMat) * count) + " / min)</p>");

    matNode.append(matList);
    matNode.append(matInfo);

    container.append(matNode);

}

// 生産物ツリーの表示
function viewProducts(target, container) {

    if (target == undefined) return;

    container.empty();
    target.products.forEach(function (el) {
        appendProducts(
            getMaterialData(el.id),
            container);
    });

}

// 生産物ツリーの表示追加
function appendProducts(target, parent) {

    if (target == undefined) return;

    var matNode = $("<div class=\"productNode\"></div>");
    var matList = $("<div class=\"productsList\"></div>");
    var matInfo = $("<div class=\"productInfo\"></div>");

    target.products.forEach(function (el) {
        appendProducts(
            getMaterialData(el.id),
            matList);
    });

    matInfo.append("<p><i>" + getEquipmentName(target.productEquipment) + "</i></p>")
    .append("<img class= \"materialChanger\" data-id=\"" + target.id + "\" src=\"" + ICON_PATH + target.icon + "\">")
    .append("<p>" + getMaterialName(target.id) + "</p>");

    matNode.append(matInfo);
    matNode.append(matList);

    parent.append(matNode);

}

// IDから素材データを取得
function getMaterialData(targetId) {

    var material = MATERIALS_DATA.find(function (el) {
        return (el.id == targetId);
    });

    return material;
}

// IDから素材名を取得
function getMaterialName(targetId) {

    var material = getMaterialData(targetId);

    if (material !== undefined) {
        return material.localName();
    }
    else {
        return "undefined";
    }

}

// IDから設備データを取得
function getEquipmentData(targetId) {

    var equipment = EQUIPMENTS_DATA.find(function (el) {
        return (el.id == targetId);
    });

    return equipment;
}

// IDから設備名を取得
function getEquipmentName(targetId) {

    var equipment = getEquipmentData(targetId);

    if (equipment !== undefined) {
        return equipment.localName();
    }
    else {
        return "undefined";
    }

}

// ローカル名を取得
function getLocalName(nameId, language) {

    if (NAMES_DATA[nameId] !== undefined) {

        if (NAMES_DATA[nameId][language] !== undefined) {

            return NAMES_DATA[nameId][language];
        }
        else {

            return nameId;
        }
    }
    else {

        return nameId;
    }

}

// 消費レートを算出
function calcConsumeRate(consumeCount, material) {

    if (material.craftingTime != 0) {
        return (consumeCount * 60 / material.craftingTime);
    }
    else {
        return 0;
    }

}

// 製作レートを算出
function calcProductRate(material) {

    if (material.craftingTime != 0) {
        return (material.productCount * 60 / material.craftingTime);
    }
    else {
        return 0;
    }

}

function roundFormat(num) {
    return (Math.round(num * 100) / 100);
}

