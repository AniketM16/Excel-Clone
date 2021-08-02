//ready->When the page is rendered and we get the document object(root)
const dialog= require('electron').remote.dialog;
const $=require('jquery');
const fs=require("fs");
$(document).ready(function(){
    window.db=[];
    init();
    let lsc;
    $(".grid .row .cell").on("click",function(){
        //this stores the javascript context object in which the current code is running
        let clickedCell=this;
        let{rid,cid}=getRCIDfromCELL(clickedCell);
        let col = String.fromCharCode(Number(cid)+65);
        let row = Number(rid) + 1;
        let address= col + row;
        console.log(address," was clicked");
        $("#address").val(address);
        $('#formula').val(db[rid][cid].formula);
         // get all the formating from the cellobject
        // add selected class 
// checks
        $(this).addClass("selected");
        if (lsc && lsc != this)
        $(lsc).removeClass("selected");
        lsc = this;
    });
//update db
$(".grid .row .cell").on("blur",function(){
    //this stores the javascript context object in which the current code is running
    let clickedCell=this;
    let{rid,cid}=getRCIDfromCELL(clickedCell);
    let address= getAddressFromRCID(rid,cid);
    if(db[rid][cid].formula){
        deleteFormula(rid,cid);
    }
    /*db[rid][cid].val=$(this).text();
    db[rid][cid].isEmpty=false;*/
    let val=$(this).text();
    if(db[rid][cid].val==val){
        return;
    }
    db[rid][cid].isEmpty=false;
    updateUI(rid,cid,val);
    console.log(address," was blurred");
});
//formula
$("#formula").on("blur",function(){
    let address=$("#address").val();
    let{rid,cid}=getRCIDfromaddress(address);
    let formulaElem=$(this);
    let formula=formulaElem.val();
    //Check for validity using cycle detection in graph
    /************************MAJOR TODO ***************************/
    
    if(!isValid(formula,rid,cid)){
        const options={
            message:"There is a circular reference where a formula refers to its own cell either directly or indirectly.This might cause them to calculate incorrectly. Try removing or changing this reference,or moving the formula to different cells"
        }
        const response = dialog.showMessageBox(null,options);
        console.log(response);
        //dialog("There is a circular reference where a formula refers to its own cell either directly or indirectly.This might cause them to calculate incorrectly. Try removing or changing this reference,or moving the formula to different cells");
        return;
    }
    if(db[rid][cid].formula==formula){
        return;
    }
    if(db[rid][cid].formula!=""){
        deleteFormula(rid,cid);
    }
    if(formula==""){
        return;
    }
    //formula set
    //update db with formula
    setFormula(rid,cid,formula,address);
    //evaluate formula
    //get value from formula
    let value=evaluateFormula(formula);
    //UI update
    updateUI(rid,cid,value);
})
/********* Helper Functions  *********/
//Cycle detection using dfs
function detectCycle(rid,cid,address){
    if(db[rid][cid].children.length>0 && db[rid][cid].children[db[rid][cid].children.length-1]==address){
        return true;
    }
    for(let i=0;i<db[rid][cid].children.length;i++){
        let obj=getRCIDfromaddress(db[rid][cid].children[i]);
        let ans=detectCycle(obj.rid,obj.cid,address);
        if(ans){
            return true;
        }
    }
    return false;
}

function isValid(formula,rid,cid){
    let address=getAddressFromRCID(rid,cid);
    let arr=formula.split(" ");
    let cells=[];
    for(let i=0;i<arr.length;i++){
        if(Number(arr[i].charCodeAt(0))>=65 && arr[i].charCodeAt(0)<=90){
            cells.push(arr[i]);
        }
    }
    for(let i=0;i<cells.length;i++){
       // db[rid][cid].parent.push(arr[i]);
        let obj=getRCIDfromaddress(cells[i]);
        db[obj.rid][obj.cid].children.push(address);
    }
    let cycle=detectCycle(rid,cid,address);
    for(let i=0;i<cells.length;i++){
        // db[rid][cid].parent.push(arr[i]);
         let obj=getRCIDfromaddress(cells[i]);
         db[obj.rid][obj.cid].children.pop();
     }
     if(cycle){
         return false;
     }
     return true;
}


function setFormula(rid,cid,formula,address){
    db[rid][cid].formula=formula;
    //add dependency -> go to parent cell and get yourself added to their children array
     //delimiter (" ") used to distinguish different cells and brackets etc.
     let formulaArr=formula.split(" ");
     for(let i=0;i<formulaArr.length;i++){
         if(isGridCell(formulaArr[i])){
             let parentObj=getRCIDfromaddress(formulaArr[i]);
             db[parentObj.rid][parentObj.cid].children.push(address);
             db[rid][cid].parent.push(formulaArr[i]);
             //get the current cell added to the cells in the formula
         }
     }
}

function getRCIDfromaddress(address){
    let cid= Number(address.charCodeAt(0)) -65;
    let rid= Number(address.slice(1))-1;
    return(
        {
            rid:rid,
            cid:cid
        }
    );
}

function getAddressFromRCID(rid,cid){
    let row = Number(rid) +1;
    let col = String.fromCharCode(Number(cid)+65);
    return col+row;
}

function evaluateFormula(formula){
    //delimiter (" ") used to distinguish different cells and brackets etc.
    let formulaArr=formula.split(" ");
    for(let i=0;i<formulaArr.length;i++){
        if(isGridCell(formulaArr[i])){
            let {rid,cid}=getRCIDfromaddress(formulaArr[i]);
            let value=db[rid][cid].val;
            //replace cells with their values in the formula string
            formula=formula.replace(formulaArr[i],value);
        }
    }
    //eval is an inbuilt function which evaluates the given expression
    return infixEval(formula);
}

function evaluate(num1,num2,operation){
    num1=Number(num1);
    num2=Number(num2);
    //console.log("hello");
    if(operation==='+'){
        return num1+num2;
    }else if(operation==='-'){
        return num1-num2;
    }else if(operation==='*'){
        return num1*num2;
    }else if(operation==='/'){
        return num1/num2;
    }else return num1**num2;
}

function priority(operator){
    if(operator==="+" || operator==="-"){
        return 1;
    }
    if(operator==='*' || operator==='/'){
        return 2;
    }
    return 3;
}

function infixEval(formula){
    let formulaArr=formula.split(" ");
    console.log(formulaArr);
    let operands=[];
    let operators=[];
    for(let i=0;i<formulaArr.length;i++){
        if(formulaArr[i]==='('){
            operators.push(formulaArr[i]);
        }else if(formulaArr[i]==='+' || formulaArr[i]==='-' || formulaArr[i]==='*' || formulaArr[i]==='/' || formulaArr[i]==='**'){
            if(operands.length==0){
                alert("Invalid Formula");
                return;
            }else if(operators.length===0 || operators[operators.length-1]==='(' || priority(formulaArr[i])>priority(operators[operators.length-1])){
                operators.push(formulaArr[i]);
            }else{
                while(!operators.length===0 && priority(operators[operators.length-1])>=priority(formulaArr[i])){
                    let second=operands.pop();
                    let first=operands.pop();
                    let operation=operators.pop();
                    let ans=evaluate(first,second,operation).toString();
                    operands.push(ans);
                }
                operators.push(formulaArr[i]);
            }
        }else if(formulaArr[i]===')'){
            while(operators[operators.length-1]!='('){
                let second=operands.pop();
                let first=operands.pop();
                let operation=operators.pop();
                let ans=evaluate(first,second,operation).toString();
                operands.push(ans);
            }
            operators.pop();
        }else{
             operands.push(formulaArr[i]);
        }
    }
    console.log(operands);
    console.log(operators);
    if(operators.length==0){
        return operands[0];
    }
    let ans;
    for(let i=0;i<formulaArr.length;i++){
        ans+=formulaArr[i];
    }
    return ans;
    }

function isGridCell(formulaComp){
    let val=formulaComp.charCodeAt(0);
    return(val>=65 && val<=90);
}

function updateUI(rid,cid,val){
    $(`.cell[rid=${rid}][cid=${cid}]`).text(val);
    db[rid][cid].val=val;
    let children=db[rid][cid].children;
    for(let i=0;i<children.length;i++){
        let childAddress=children[i];
        let childObj= getRCIDfromaddress(childAddress);
        let updatedVal=evaluateFormula(db[childObj.rid][childObj.cid].formula);
        updateUI(childObj.rid,childObj.cid,updatedVal);
        //Recursively updating all the children
    }
}

function deleteFormula(rid,cid){
    let address=getAddressFromRCID(rid,cid);
    let parents=db[rid][cid].parent;
    //Remove the cell from the children of parent array
    for(let i=0;i<parents.length;i++){
        let parentObj=getRCIDfromaddress(parents[i]);
        let currParentChildren=db[parentObj.rid][parentObj.cid].children;
        let newArr=[];
        for(let j=0;j<currParentChildren.length;j++){
            if(currParentChildren[j]==address){
                continue;
            }
            newArr.push(currParentChildren[j]);
        }
        db[parentObj.rid][parentObj.cid].children=newArr;
    }
    /*
    //Remove the cell from the parent array of the children
    let children=db[rid][cid].children;
    for(let i=0;i<children.length;i++){
        let childObj=getRCIDfromaddress(children[i]);
        let currChildParents=db[childObj.rid][childObj.cid].parent;
        let newArr=[];
        for(let j=0;j<currChildParents.length;j++){
            if(currChildParents[j]==address){
                continue;
            }
            newArr.push(currChildParents[j]);
        }
        db[childObj.rid][childObj.cid].parent=newArr;
    }

    //Remove the children of the cell
    db[rid][cid].children=[];
    */
    db[rid][cid].parent=[];
    db[rid][cid].formula="";

}



//new,open,save
$("#new").on("click",init);
$("#save").on("click",async function(){
    //dialog box new file option
    let sfilePath = dialog.showSaveDialogSync();
    let data =JSON.stringify(db);
    fs.writeFileSync(sfilePath,data);
})
$('#open').on("click",function(){
    //open dialog box
    let fileArr= dialog.showOpenDialogSync();
    //read file data
    let content=fs.readFileSync(fileArr[0]);
    db=JSON.parse(content);
    setUI(db);
})

/***** Helper Functions ****************/

function getRCIDfromCELL(clickedCell){
    let rid=$(clickedCell).attr("rid");
    let cid=$(clickedCell).attr("cid");
    return {rid: rid, cid: cid};
}

function init(){
    let allRows=$(".grid .row");
    for(let i=0;i<allRows.length;i++){
        let allCols=$(allRows[i]).find(".cell");
        let colsArr=[];
        for(let j=0;j<allCols.length;j++){
            let cellObj={
                val:0,
                formula:"",
                isEmpty:true,
                children: [],
                parent: []
                //to handle dependencies
            }
            colsArr.push(cellObj);
            $(`.cell[rid=${i}][cid=${j}]`).text("");
        }
        db.push(colsArr);
    }
    console.log(db);
}

function setUI(db){
    let allRows=$(".grid .row");
    for(let i=0;i<allRows.length;i++){
        let allCols=$(allRows[0]).find('.cell');
        for(let j=0;j<allCols.length;j++){
            let val=db[i][j].val;
            let isEmpty=db[i][j].isEmpty;
            if(!isEmpty){
            $(`.cell[rid=${i}][cid=${j}]`).text(val);
            }
        }
    }
    
}
})