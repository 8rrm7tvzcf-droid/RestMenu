const confidence={type:'string',enum:['high','medium','low']};
const stringArray={type:'array',items:{type:'string'}};
const rectProperties={x:{type:'integer',minimum:0,maximum:1000},y:{type:'integer',minimum:0,maximum:1000},width:{type:'integer',minimum:1,maximum:1000},height:{type:'integer',minimum:1,maximum:1000}};

const regionSchema={type:'object',additionalProperties:false,required:['blockId','x','y','width','height','columnIndex','readingOrder','kind','smallText','visuallyLinkedBlockId'],properties:{
 blockId:{type:'string'},...rectProperties,columnIndex:{type:'integer',minimum:1,maximum:6},readingOrder:{type:'integer',minimum:1},
 kind:{type:'string',enum:['heading','menu_items','prices','notes','mixed']},smallText:{type:'boolean'},visuallyLinkedBlockId:{type:['string','null']}
}};

export const layoutSchema={type:'object',additionalProperties:false,required:['columnCount','layoutAmbiguous','pageQuality','regions','warnings'],properties:{
 columnCount:{type:'integer',minimum:1,maximum:6},layoutAmbiguous:{type:'boolean'},pageQuality:{type:'string',enum:['good','difficult','unreadable']},
 regions:{type:'array',minItems:1,maxItems:10,items:regionSchema},warnings:stringArray
}};

const itemConfidence={type:'object',additionalProperties:false,required:['name','description','price'],properties:{name:confidence,description:confidence,price:confidence}};
const itemSchema={type:'object',additionalProperties:false,required:['name','description','price','currency','confidence','variants','formats','supplements','allergens','number','notes','sourceLineIds'],properties:{
 name:{type:'string'},description:{type:'string'},price:{type:['string','null']},currency:{type:['string','null']},confidence:itemConfidence,
 variants:stringArray,formats:stringArray,supplements:stringArray,allergens:stringArray,number:{type:['string','null']},notes:stringArray,sourceLineIds:stringArray
}};
const categorySchema={type:'object',additionalProperties:false,required:['name','confidence','sourceLineIds','items'],properties:{name:{type:'string'},confidence,sourceLineIds:stringArray,items:{type:'array',items:itemSchema}}};
const rawLineSchema={type:'object',additionalProperties:false,required:['id','text','confidence'],properties:{id:{type:'string'},text:{type:'string'},confidence}};
const unclassifiedSchema={type:'object',additionalProperties:false,required:['text','confidence','sourceLineIds'],properties:{text:{type:'string'},confidence,sourceLineIds:stringArray}};

export const blockSchema={type:'object',additionalProperties:false,required:['blockConfidence','qualityWarning','rawTextLines','categories','unclassifiedText','warnings'],properties:{
 blockConfidence:confidence,qualityWarning:{type:['string','null']},rawTextLines:{type:'array',items:rawLineSchema},
 categories:{type:'array',items:categorySchema},unclassifiedText:{type:'array',items:unclassifiedSchema},warnings:stringArray
}};

const correctionSchema={type:'object',additionalProperties:false,required:['action','categoryId','targetCategoryId','itemId','reason'],properties:{
 action:{type:'string',enum:['remove_category','merge_categories','move_item','leave_unclassified']},categoryId:{type:['string','null']},targetCategoryId:{type:['string','null']},itemId:{type:['string','null']},reason:{type:'string'}
}};
export const structuralValidationSchema={type:'object',additionalProperties:false,required:['corrections'],properties:{corrections:{type:'array',maxItems:30,items:correctionSchema}}};
