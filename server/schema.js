const confidence={type:'string',enum:['high','medium','low']};
const stringArray={type:'array',items:{type:'string'}};

const lineSchema={
 type:'object',additionalProperties:false,
 required:['id','text','column','order','confidence'],
 properties:{id:{type:'string'},text:{type:'string'},column:{type:'integer',minimum:1,maximum:6},order:{type:'integer',minimum:1},confidence}
};

export const transcriptionSchema={
 type:'object',additionalProperties:false,
 required:['columnCount','layoutAmbiguous','qualityWarning','lines','notes'],
 properties:{
  columnCount:{type:'integer',minimum:1,maximum:6},layoutAmbiguous:{type:'boolean'},qualityWarning:{type:['string','null']},
  lines:{type:'array',items:lineSchema},notes:stringArray
 }
};

const itemConfidence={type:'object',additionalProperties:false,required:['name','description','price'],properties:{name:confidence,description:confidence,price:confidence}};
const itemSchema={
 type:'object',additionalProperties:false,
 required:['name','description','price','currency','confidence','variants','formats','supplements','allergens','number','notes','sourceLineIds'],
 properties:{
  name:{type:'string'},description:{type:'string'},price:{type:['string','null']},currency:{type:['string','null']},confidence:itemConfidence,
  variants:stringArray,formats:stringArray,supplements:stringArray,allergens:stringArray,number:{type:['string','null']},notes:stringArray,sourceLineIds:stringArray
 }
};
const categorySchema={
 type:'object',additionalProperties:false,required:['name','confidence','sourceLineIds','items'],
 properties:{name:{type:'string'},confidence,sourceLineIds:stringArray,items:{type:'array',items:itemSchema}}
};
const unclassifiedSchema={
 type:'object',additionalProperties:false,required:['text','confidence','sourceLineIds'],
 properties:{text:{type:'string'},confidence,sourceLineIds:stringArray}
};

export const menuSchema={
 type:'object',additionalProperties:false,
 required:['restaurantName','categories','unclassifiedText','warnings','qualityWarning'],
 properties:{
  restaurantName:{type:['string','null']},qualityWarning:{type:['string','null']},
  categories:{type:'array',items:categorySchema},unclassifiedText:{type:'array',items:unclassifiedSchema},warnings:stringArray
 }
};
