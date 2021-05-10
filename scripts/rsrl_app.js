
console.log('916_1700');





/*#0 Todo:
 *
 *
 * Having some issues with window size when running on my desktop (overflowing, leading to issues with fullscreen check?)
 * Full screen check working oppositely than intended on desktop (not on laptop? both on chrome) - button only visible while full screen...
 *
 * Recent changes:
 *  Added full screen check, button, slide
 *
 *  Display selection made as soon as kepress hit - assuming most participants will respond ~1s, cuts 6 min (20%) out of task!
 *
 *  Caused some bugs with autmation
 *  Solved:
 *    moved trialN out of local scope (ie used to be a variable passed from function to function, instead of a more global var that was pulled from)
 *    updated autmation to account for on-press selection (issues with getting stuck in practice, or skipping blocks - due to stim time being used solely for timeouts, and still being set to 5ms)
 *
 */

// ms clock
var time;
setInterval(function(){
    time = new Date().getTime();
},1);

// track screen focus, fullscreen
var screenInteractions = 0,
    isFullscreen;
window.onblur = function() { // onblur == whenever focus leaves window/tab
  screenInteractions++;
};

// for some reason on windows css properties not applying correctly on loading
$('body').css('width','100%');
$('body').css('height','100%');



// pavlovia
//console.log('Pavlovia version',Pavlovia.version);
//pav = new Pavlovia(); // pavlovia server handle
//pav._init(); // initalize connections with pavlovia server

function getSub(arr) {
  x = arr.find(i => i.includes('sb=')); // go through array, grab element that includes subject code 
  return x;
}

// preload stimuli to have ready in local cache- faster/more accurate presentation time
var loadContent = function(){
    
    var $preloadImg = $('#preloadImg'); 
    
    var switches = { // object of boolean switches for each content to be preloaded
        img_stim:false,
        img_machines:false
        // vid:false
        // audio: false
        };
    
    function readyCheck(){ // simple function to check if all content is loaded
        if(!Object.values(switches).includes(false)){
            main();
        }
        
    }
    
    // could come up with a more flexible way to do this loop
    for (let imgInd = 0; imgInd < imageList.length; imgInd++ ){
        let image = './rsrl_memoryImages/'+imageList[imgInd];
        $preloadImg.attr('src',image);
        
        if(imgInd == imageList.length-1){
            // on last iteration, flip switch to true, check if all stim has been preloaded
            switches.img_stim = true;
            readyCheck();
        }
    }
    
    for (let imgInd = 1; imgInd<6; imgInd++){
      let image = "./rsrl_images/machine"+(imgInd)+".png";
      $preloadImg.attr('src',image);
        
      if(imgInd == 5){
          // on last iteration, flip switch to true, check if all stim has been preloaded
        switches.img_machines = true;
        readyCheck();
      }
    }
    
    
};

var main = function(){
    $(".loadCont").remove(); // once everything loaded, remove loading animation
    
    $('#outcome').css('display','none');
    $('#outcome').css('visibility','visible');
    $('#stimDisplay').css('display','none');
    $('#stimDisplay').css('visibility','visible');
    $('#infoCont').css('display','inline');
    
    
    
    var winHeight = window.innerHeight,
        winWidth = window.innerWidth,
        reqFullscreen = false, // require user to be in full screen
        
        // url parameters
        subj = getSub(window.location.search.split('?')).split('sb=')[1], // split up url by ?s, grab subject element, extract number
    
        // task parameters
        nTrials, // passed into main task function, set =to _p for practice _main for main
        trialN = 0,
        nTrials_p = 20,
        nTrials_main = 61, // number of trials to be presented per block
        nBlocks = 3, // number of blocks
        block, // block var to be passed into task function
        blockInd = 0, // starting block of main task
        imgInd,
        shownImage,
        
        // different task screens
        $screens = $('.screen'),
        $infocont = $('#infoCont'),
        $stimDisplay = $('#stimDisplay'),
        $qDisplay = $('#qDisplay'),
        $oldnew = $('#oldnewDisplay'),
        
        // instructions
        readTime = 1000, // how long in ms to wait before allowing user to progress to next slide, encourages reading
        $instructions = $('#instructions'), // div handle
        instructions = ['error - contact experimenter'], // array containing instruction slides; set with fx: setInstructions(new_instructions)/ default message if script doesnt execute
        $navi = $('#navi'), // visual graphic indicating when user can proceed / navigate the instructions
        slide = 0,
        titleSlide = 0, // indicate title slide index, set to 'False' or non-int if no title slide
        
        // task stim
        stimSide = [0,1], // used to randomize side presented
        $fixation = $('#fixation'),
        $leftSide = $('#leftSide'),
        $rightSide = $('#rightSide'),
        machineLeft, machineRight,
        keyPress,
        selectedMachine,
        trialTimeout,
        machines=new Array(5).fill(0),
        pMachines = new Array(2).fill(0),
        $outcome = $('#outcome'),
        $ticket = $('#ticket'),
        $outcomeImg = $('#outcomeImg'),
        $points = $('#points'),
        points = 0,
        trialOutcome,
        pointsTotal = 0,
        
        // memory
        $memFix = $('#fixationMem'),
        $memImage = $('#memImage'),
        memSelector = Number,
        memSelect,
        nClicks_mem = 0,
        rt_mem = 0,
        memSide = [0,1],
        memOptions = ['old','new'],
        memText = ['saw','didn&#39;t<br>see'],
        choiceOptions = new Array(6).fill(memOptions[0]), // preallocate with one option now, will redefine after shuffling which side is old/new
        choiceHighlight = ['left_def','left_prob','left_maybe','right_maybe','right_prob','right_def'],
        confidenceOptions = ['definitely','probably','maybe','maybe','probably','definitely'],
        confidenceSelect,
        
        //$splat = $("<img>"),
        //$rewardText = $("<span>"),
        //plopSound = new Audio("./sounds/plop.mp3"),
        
        // controllers
        fix,
        stimTime=3000, // 3000 how long machines are valid for selection
        selTime=1000, // 2000 bad name, how long selected machine is highlighted not how long to select
        outcomeTime=2000, // 500 how long to display outcome
        memWait = 500, // how long iti for old/new memory task
        reading = true, // read time hasnt timed out
        practiceCompleted = false,
        taskCompleted = false,
        questionsCompleted = false,
        memoryCompleted = false,
        inTask_learning = false,
        inTask_oldNew = false,
        taskOn = false,
        canClick = false, 
        wait = false,
        taskOver = false,
        ii,jj,kk,
        
        //data log(['image','category','confidence', 'old/new','actual','correct_mem','nClicks_mem','changedMind','selectInitial','rT_mem')
        dataLog = [['section:','RISK SENSITIVE RL TASK'],['subject','time','block','blockTrial','trialN','condition','machine1','machine2','stimSide','keyPress','selection','image','outcome','optimal','risky','rt','total points','changeFocus','fullScreen']],
        qLog = [['section:','TASK STRUCTURE QUESTIONS'],['subject','time','machine','question','correctResponse','userResponse','userCorrect','rt','changeFocus','fullScreen']],
        memLog = [['section:','RECOGNITION MEMORY TEST'],['subject','time','trialN','image','correctResponse','userResponse','userConfidence','userCorrect','displayTrial','trialOutcome','nClicks_mem','rt','changeFocus','fullScreen']],
        trialStart,
        rt; // reactiontime
        
    
    
      setInterval(function(){
        checkFullscreen();
      },500);
    
        
    // on button press
    $(document).on('keyup',function(e) {
        keyPress = e.which; // get the key
        
        if (reading == true){ // if in instructions
            if(wait==false){ // if not waiting (ie reading timer has passed)
                
                // if the slide has been read
                if(slideVisited[slide] == 1){
                    wait = false;
                    nextSlide(); // pull up the next instruction slide
                    setTimeout(function(){
                        if(typeof(instructions[slide])=='string' || instructions != instructions_memory){slideVisited[slide]=1;} // set read timer if text slide (i.e. does not require user input)
                    },readTime);
                    
                // controls for user input instructions slides (e.g. practice )
                } else if(typeof(instructions[slide]) == 'object' && instructions == instructions_memory){
                    
                    // recognition practice slides
                    if(memSelector!=Number){ // if no current selection (appropriate keypress has not yet been made)
                        choiceHighlight.map(x=>$('#'+x).removeClass('highlight')); // remove any highlighted selections (e.g. from previous slides)
                    }
                    
                    if(keyPress == 81){ // q
                        if(memSelector==Number){ // if first selection
                            memSelector=2; // left of center
                        }else if(memSelector>0){ // selection made and not currently left-most selection
                            memSelector--;} // decrease selection (left) one
                        
                        
                    }else if (keyPress == 80){ // p
                        if(memSelector==Number){memSelector=3;} // if first selection, right of center
                        else if( memSelector<5){ // selection made and not currently right-most selection
                            memSelector++;} // increase selection (right) one
                        
                    }else if (keyPress == 32){ // space bar => locking selection in
                        if(memSelect == $('#inlineInst').attr('href')){ // href link used in instruction slide to set correct answer
                            memSelect = undefined; memSelector = Number; // reset selectors
                            keyPress = 39; // force righr arrow to move onto next slide
                            nextSlide(); 
                            if(typeof(instructions[slide])!='object'){setTimeout(function(){ // if text slide, start read timer
                                slideVisited[slide]=1;
                            },readTime);
                            }
                        } else { // if didnt select indicated (correct) option
                            $('#inlineInst').text($('#tryAgain').text()); // ask user to try again
                        }
                    }
                    
                    memSelect = confidenceOptions[memSelector]+' '+memOptions[memSide[Math.round(memSelector/5)]]; // from array of options, get binary choice (e.g [0,0,0,1,1,1]=>[0,1])
                    let mtd = memOptions[memSide[Math.round(memSelector/5)]]; // memory text display, used to show text display of users current selection
                    $('#'+choiceHighlight[memSelector]).addClass('highlight'); // highlight current selection
                    if(memSelector!=Number){ // if a selection has been made
                        $('#displaySelection').html(confidenceOptions[memSelector]+' '+memText[memOptions.indexOf(mtd)]); // update display text to reflect current selection
                        $('#displaySelection').css('margin-left','-'+($('#displaySelection').width()/2)+'px'); // center text
                    }
                    
                }
                
                // at the end of a set of instructions
                var endInstructions = function (){
                    slide = 0; // reset slide 
                    taskOn = true; // moving into a task
                    reading = false; // no longer reading insturcitonss
                    console.log('instructions over');
                    $infocont.css('display','none'); // turn off info display
                    $navi.css('display','none'); // turn off navi
                    clearInterval(checkSlide); // clear slide-read checker
                    $('*').css('cursor','none'); // turn off cursor (if needed can turn on in task function)
                    
                };
                
                // at the end of an instruction set
                
                if(slide==instructions.length-1){ // at the last slide and presses "q" (81) or "p" (80)
                    
                    // start practice
                    if(!practiceCompleted  && (keyPress==80||keyPress==81)){ // reminder: !var == var = false
                        endInstructions();
                        console.log('begin practice');
                        return practice();
                    
                    // start task
                    }else if(practiceCompleted && !taskCompleted && (keyPress==80||keyPress==81)) {
                        endInstructions();
                        console.log('begin main task');
                        return mainTask();
                    
                    // start questions
                    } else if (practiceCompleted && taskCompleted && !questionsCompleted && slide==instructions_questions.length-1 && (keyPress > 47 && keyPress < 58)){
                        endInstructions();
                        console.log('starting machine questions');
                        return machineQuestions();
                    
                    // start memory
                    }else if(practiceCompleted && taskCompleted && questionsCompleted && slide==instructions_memory.length-1 && keyPress == 32){
                        endInstructions();
                        return oldNew(imageList);
                        
                    }
                }
            
            }
            
        }
    });
        
        
    shuffle(memSide);
    var oldKey = ['Q','P'][memSide[0]], newKey = ['Q','P'][memSide[1]];
    
    $('#labelLeft').html(memText[memSide[0]]);
    $('#labelRight').html(memText[memSide[1]]);
    choiceOptions.fill(memOptions[memSide[0]]).fill(memOptions[memSide[1]],3);
        
        if(['555','666','999'].includes(subj)){
            console.log('debug mode');
        }
                
        
    // declare classes
    console.log('setting classes');
    class machine{
    constructor(name,value,image,payout,count){
        this.name = name; // machine's name
        this.value = value; // value associated with machine 
        this.image = image; // machine's image
        this.payout = payout; // binary payout schedule (if variable return)
        this.count = count; // count log - how many times selected
        }
    }
    
    class trialType{
        constructor(condition,stimuli,n){
            this.condition = condition; // trial type condition (fixed, )
            this.stimuli = stimuli; // stimuli, e.g. machines, to be displayed
            this.n = n; // how many of this trial type to be displayed
        }
    }
    
  console.log('classes set');
  console.log('preloading images');
    function preloadImage(url){
        (new Image()).src = url;
    }
        
    
    // set up stimuli
    for (imgInd = 0; imgInd < imageList.length; imgInd++ ){
        preloadImage('./rsrl_memoryImages/'+imageList[imgInd]);
        imageList[imgInd] = {image:imageList[imgInd], // create class w relevant properties
                            seen:false,
                            trial:'n/a',
                            machine:'n/a',
                            outcome:'n/a', // fixed(0), riskgain(1), or riskloss(-1)
                            memTrial:'n/a',
                            foil:'n/a',
                            rating:'n/a', // old/new
                            corrMem:'n/a', // seen == false && rating == new || seen == true && rating == old
                            confidence:'n/a'};
    }
    imgInd=0;
    console.log('images preloaded');
    // to call all keys as array: Object.keys(imageList[imgInd]));
    // to call all values as array: Object.values(imageList[imgInd]));
    
    shuffle(imageList); // randomize image order
    imageList = imageList.slice(0,Math.ceil((nTrials_main*3)*1.5)); // images == number of trials, + 50% for foils
    
    console.log('constructing machines');
    var machineImgs = Array.from(Array(5).keys(), x => x+1), // == list(range(5))
        machineValues = [[0],[20],[40],[0,40],[0,80]],
        pImgs = Array.from(Array(2).keys(), x=>x+1),
        img, // temp variable for img assignment
        pImg;
    
    // construct each machine
    console.log('constructing main machines');
    for (ii=0; ii < 5; ii++){ // for some reason using length of machineImgs returns wrong int? 3 instead of 5, but console logs it as 5...
        img = getRandomNoSub(machineImgs); // get random valid index for img
        preloadImage("./rsrl_images/machine"+(img)+".png");
        if (machineValues[ii].length<2){ // fixed return machine
            machines[ii] = new machine('machine'+(ii+1),machineValues[ii],"./rsrl_images/machine"+(img)+".png",[0],0);
        } else { // variable return
            var payout = new Array(nBlocks).fill([]); // make as many payout blocks as there are blocks, preallocate w empty arrays
            for(jj=0;jj<nBlocks;jj++){ // for each block, populate array
                payout[jj] = shuffleOutcome(new Array(nTrials_main).fill(1).fill(0,0,(nTrials_main)/2)).slice(0,nTrials_main); // with pseudo-random shuffled binary outcome
            }
            machines[ii] = new machine('machine'+(ii+1),machineValues[ii],"./rsrl_images/machine"+(img)+".png", payout, 0);
        }
    }
        
        
    
    // practice machines
    pImg = getRandomNoSub(pImgs); // get random valid int
    pMachines[0] = new machine('pMachine1',[1],"./rsrl_images/machineP"+(pImg)+".png",[0],0);
    pImg = getRandomNoSub(pImgs); // get random valid int
    pMachines[1] = new machine('pMachine2',[0,2],"./rsrl_images/machineP"+(pImg)+".png",[shuffleOutcome(new Array(100).fill(1).fill(0,0,100/2)).slice(0,nTrials_p)],0); 
    console.log('machines constructed');
    // set up trial order
    
    // define trial types
    console.log('constructing trials');
    var pForced = new trialType('pForced',pMachines.map(x=>[x]),10),
        pChoice = new trialType('pChoice',[[pMachines[0],pMachines[1]]],16),
        pTrials = {type:[pForced,pChoice],blocks:[[]]},
        forced = new trialType('forced',machines.map(x=>[x]),5),
        riskChoice = new trialType('riskChoice',[[machines[1],machines[3]],[machines[2],machines[4]]],8),
        riskOptimal = new trialType('riskOptimal',[[machines[1],machines[4]]],6),
        testChoice =  new trialType('testChoice',
                                    [[machines[0],machines[1]],
                                     [machines[0],machines[2]],
                                     [machines[0],machines[3]],
                                     [machines[0],machines[4]],
                                     [machines[1],machines[2]],
                                     [machines[2],machines[3]],
                                     [machines[3],machines[4]],
                                     ], 2),
        trials = {type:[forced, riskChoice, riskOptimal, testChoice],blocks:[[],[],[]]};
        
    // create trial lists
    // practice
    
    console.log('creating practice trial list');
    var condition, stimSet;
    block = 0; // only one block in practice
    for(ii = 0; ii<pTrials.type.length;ii++){
        condition = pTrials.type[ii];
        for(jj=0; jj<condition.stimuli.length;jj++){
            stimSet = condition.stimuli[jj];
            for(kk=0; kk<condition.n;kk++){
                pTrials.blocks[block].push([condition.condition,stimSet]);
            }
        }
    }
    // go through each block
    for(ii = 0; ii<pTrials.blocks.length;ii++){
        block = pTrials.blocks[ii];
        shuffle(block); // shuffle order
    }
    console.log('construcing main trial list');
    // task
    for(var nBlock = 0; nBlock < trials.blocks.length; nBlock++){ // for each block
        for(ii = 0; ii<trials.type.length;ii++){ // for each trial type (condition)
            condition = trials.type[ii]; // easier handle
            for(jj=0; jj<condition.stimuli.length;jj++){ // for each stimuli set within condition
                stimSet = condition.stimuli[jj]; // easier handle
                for(kk=0; kk<condition.n;kk++){ // for the number of presentations
                    trials.blocks[nBlock].push([condition.condition,stimSet]); // append trial to block's trial list
                }
            }
        }
        trials.blocks[nBlock] = shuffle(trials.blocks[nBlock]).slice(0,nTrials_main);
    }
    
    // shuffle trial order w constraint that risky trial of a machine doesn't follow fixed trial of it
    for(ii = 0; ii < trials.blocks.length; ii++){
        var shuffled = false;
        block = trials.blocks[ii];
        shuffle(block);
        while(shuffled == false){
            shuffled = true;
            for(jj=0; jj<block.length-2; jj++){
                var trial = block[jj], // current trial, [0] = trial type, [1] = array of machines presented
                    trial_ = block[jj+1]; // next trial
                    
                    // if current is forced, and next is risky and has current machine as option
                    if(trial[0]=='forced' && trial_[0].substring(0,4) == 'risk' && trial_[1].includes(trial[1][0])){ 
                        shuffle(block); // reshuffle
                        shuffled = false; // recheck block
                        }
                    
            }
        }
    }
    
    console.log('trials constructed');
    
    //****************************************************** * * * * *
    //***** SUPPORT FUNCTIONS ******************* * * *
    //******************** * *
    
    // check if user is in fullscreen
    checkFullscreen = function(){
      if (1>=outerHeight-innerHeight){
        $('#fullscreenButton').css('display','none');
      } else {
        console.log('fs; Window',Window.screenTop,'  window',window.screenY);
        $('#fullscreenButton').css('display','inline');
        }
      if (slide < 2){
        $('#fullscreenButton').css('display','none');
      }
    };
    
    // sum of array
    function arrSum(arr){
        return arr.reduce(function(a,b){
            return a + b;
        }, 0);
    }
    
    function shuffle(sourceArray) {
    for (var i = 0; i < sourceArray.length - 1; i++) {
        var j = i + Math.floor(Math.random() * (sourceArray.length - i));

        var temp = sourceArray[j];
        sourceArray[j] = sourceArray[i];
        sourceArray[i] = temp;
    }
    return sourceArray;
    }
    
    
    // function to pseudo randomize outcome reward, restrict outcome to max 4 repititons 
    function shuffleOutcome(array){
        var shuffled = false;
            while(shuffled==false){
                shuffled=true;
                for (let ii=0;ii<array.length-4;ii++){
                    if(arrSum(array.slice(ii,ii+5))==array[ii]*5){
                      let oldArray = array;
                        array = shuffle(array);
                        shuffled = false;
                        break;
                    }
                }
            }
        return array;
    }
    
     // random sampling without substitution
    function getRandomNoSub(array){
        var randomIndex = Math.floor(Math.random()*array.length);
        return array.splice(randomIndex, 1)[0];
    }
    
    // preload images
    
    
    //****************************************************** * * * * *
    //***** TASK FUNCTIONS ******************* * * *
    //******************** * *
    
    //@1   *  *  *  *  *  *  *  *  *  *  *  *  *  *
    // ** ** ** **  DECISION MAKING ** **  ** **
    //   *  *  *  *  *  *  *  *  *  *  *  *  *  *
    
    
    
    function fixation(block){
        var iti = 500; // 500 to replicate Gail's methods; for random jitter iti: Math.random()*(max-min)+min
        if(subj=='999'){
            iti=5; selTime=5; outcomeTime=50;
            }
        if(subj=='555'){iti=250;}
        console.log('trial ',trialN);
        console.log("fixation on");
        $stimDisplay.css('display','inline');
        $fixation.css('display','inline');
        // set up stim, block[trialN]
        shuffle(stimSide);
        trial = block[trialN];
            try{ machineLeft = trial[1][stimSide[0]];
            $leftSide.attr('src',machineLeft.image);
            } catch(err) {machineLeft=undefined;}
            try{ machineRight = trial[1][stimSide[1]];
            $rightSide.attr('src',machineRight.image);
            } catch(err) {machineRight=undefined;}
        
        var a = time;
        setTimeout(function(){
            console.log("fixation off",time-a,iti);
            $fixation.css('display','none');
            stim();
        },iti);
    }
    
            
    function stim(){
        keyPress = undefined;
        console.log("stim on");
        if(machineLeft){$leftSide.css('display','inline');}
        if(machineRight){$rightSide.css('display','inline');}
        trialStart=time;
        stimOn = true;
        a = time;
        
        function selectionMade(keyPress){
          clearTimeout(trialTimeout);
          rt = time-trialStart;
          stimOn = false;
          console.log("stim off",time-a,stimTime);
          selection(keyPress);
        }
        
        if(subj=='999'){ // automate random selection
          console.log(block[trialN][1].length);
            if(block[trialN][1].length>1){
              keyPress = [81,80][Math.floor(Math.random() * 2)];
              selectionMade(keyPress);
            }else{
              keyPress = [81,80][stimSide[0]];
              selectionMade(keyPress);
            }
        }
        
        
        $(document).on('keyup',function(e) {
          if(keyPress == 80 && machineRight && stimOn){
            clearTimeout(trialTimeout);
            selectionMade(keyPress,trialN);
          } else if (keyPress == 81 && machineLeft && stimOn){
            clearTimeout(trialTimeout);
            selectionMade(keyPress);
          }
        });
            
       
        // get valid key press while stim on
                
        trialTimeout = setTimeout(function(){ // trial timed out, skip to outcome
          rt = 'n/a';
          stimOn = false;
          if(subj!="999"){outcome(keyPress, undefined);} // keypress, trial, selected machine (none)
        },stimTime);//3000
    }
    
    function selection(keyPress){
        
            console.log('animation on  ',keyPress);
            if(keyPress == 81){
                $leftSide.addClass('selected'); // if button1{leftside} else if button2{rightside}
                $rightSide.css('display','none');
                selectedMachine = machineLeft;
            } else if (keyPress == 80){
                $rightSide.addClass('selected');
                $leftSide.css('display','none');
                selectedMachine = machineRight;
            } else if (!keyPress){
                selectedMachine = undefined;
            }
            a=time;
            setTimeout(function(){
                console.log('animation off',time-a,selTime);
                $stimDisplay.css("display","none");
                outcome(keyPress, selectedMachine);
            },selTime);//2000
                
    }
    
    function outcome(keyPress, selectedMachine){
        console.log('outcome on');
                $leftSide.removeClass('selected'); $rightSide.removeClass('selected');
                $leftSide.css('display','none'); $rightSide.css('display','none');
                
        // if a selection was made
        if(selectedMachine){ 
                imgInd=(blockInd*nTrials_main)+trialN;
                trialImage = imageList[imgInd];
            $outcome.css('display','inline');
            if(selectedMachine.value.length>1){
                points = selectedMachine.value[selectedMachine.payout[blockInd][selectedMachine.count]]; // points = selected machine, value determined by payout schedule
                if(selectedMachine.name[0]=='p'){
                    points = selectedMachine.value[selectedMachine.payout[0][selectedMachine.count]];}
                if(points>0){trialOutcome = 'riskGain';}else{trialOutcome='riskLoss';}
                $points.html(points); // ticket display
                
                pointsTotal += points;
            } else {
                trialOutcome='fixed';
                points = selectedMachine.value[0]; // fixed return value
                $points.html(points); // ticket display
                pointsTotal += points;
            }
            
            if(practiceCompleted){
                // update image properties
                $outcomeImg.attr('src','./rsrl_memoryImages/'+trialImage.image);
                [trialImage.seen, trialImage.trial, trialImage.machine, trialImage.outcome] = [true, (blockInd*block.length)+trialN, selectedMachine.name, trialOutcome];
            }
                
            selectedMachine.count++; // update counter
        
        // if no selection was made
        } else { // otherwise provide feedback to respond faster
        $outcome.css('display','none');
        $infocont.css('display','inline');
        $instructions.html('<h3>Too slow</h3>');
        }
        
        a=time;
        setTimeout(function(){
            console.log('outcome off',time-a);
            $outcome.css('display','none');
            $infocont.css('display','none');
            if (trialN < nTrials){ // so long as current trial is less than total n trials
                fixation(block);
            } else {
                console.log('end of block ',blockInd);
                
                if(block[0][0][0]=='p'){ // end of practice block
                    practiceCompleted = true;
                    console.log('end of practice');
                    instructions_main.unshift('You won '+pointsTotal+' points from the point machines '+
                                              'during the practice trials! <br><br>Great work!<br><br> Press the RIGHT ARROW key to continue.');
                    taskOn=false;
                    setInstructions(instructions_main);
                    displayInstructions(0);
                    
                } else if(blockInd==nBlocks-1){ // final block of a set, i.e. the main task
                    
                console.log('task over!');
                taskCompleted = true;
                taskOn = false;
                instructions_questions.unshift("That's the end of the game! <br> Congratulations, you won "+pointsTotal+" points!<br><br> Press the RIGHT ARROW key to continue.");
                setInstructions(instructions_questions);
                displayInstructions(0);
                
                } else{ // end of a block within a set
                  
                    // "take a short break" screen
                    $('*').css('cursor','default');  // allow cursor
                    $outcome.css('display','none');
                    $stimDisplay.css('display','none');
                    $instructions.html('Take a short break :)<br><br>Current score: '+pointsTotal+'<br><br>Press the Q or P key to continue');
                    checkFullscreen();
                    var pauseTask = true;
                    $infocont.css('display','inline');
                    
                    
                    // on valid keypress, start new block
                    $(document).on('keyup',function(e) {
                        if(pauseTask && (e.which == 80 || e.which == 81)){ // only get first keyPress
                          
                            $('*').css('cursor','none');  // turn off cursor
                            $infocont.css('display','none');
                            pauseTask = false;
                            blockInd++; // update tracker
                            block = trials.blocks[blockInd];
                            trialN = 0; // reset trial counter
                            console.log('begin block: ',blockInd);
                            fixation(block); // go to break function
                            
                        }
                    });
                }
            }
            
        },outcomeTime); // 500
        
        
    // logging data
    var machine1, machine2="", optimal, risky, block_;
    if(!selectedMachine){
        selectedMachine={name:'n/a'};
        rt = 'n/a';
        risky='n/a';
        optimal='n/a';
        }else{
        risky=(selectedMachine.value.length>1);
        if(block[trialN][1].length>1 && block[trialN][0]!='riskChoice'){//if multiple machines
            optimal=(selectedMachine==block[trialN][1][1]);
        }else{
        optimal='n/a';
        }
    }
    
    machine1=block[trialN][1].map(x=>x.name)[0];
    machine2=block[trialN][1].map(x=>x.name)[1];
    if(!machine2){machine2='n/a';}
    var lr = ['l','r'];
    
    if(block[0][0][0]=='p'){block_='p';}else{block_=block[trialN][0];}
    
    if(document.fullscreenElement){isFullscreen = true;}else{isFullscreen = false;}
        
    dataLog.push([subj,time,blockInd,trialN,imgInd,block_,machine1,machine2,String(lr[stimSide[0]])+lr[stimSide[1]],keyPress,
                 selectedMachine.name,imageList[imgInd].image,points,optimal,risky,rt,pointsTotal,screenInteractions,isFullscreen]); //, and other variables of interest
    trialN++;
    
    }
    
    
    //@2   *  *  *  *  *  *  *  *  *  *  *  *  *  *
    // ** ** **  TASK STRUCTURE QUESTIONS ** **  **
    //   *  *  *  *  *  *  *  *  *  *  *  *  *  * 
    
    // something weird going on with moving onto the next trial
    
    
    function machineQuestions(){
        
        $('*').css('cursor','default');  // allow cursor
        
        // log variables
        var q, // question: 'p' == was machine probabilistc , 'v' == value of non-probabilistic outcome, 'f' == freq. of 0 out of 10 trials
            truth, 
            pa,va,fa; // probabilistic answer, value ans., freq. ans.
        
        function logQ(machine,q,truth,a,rt){
            // which machine, what the question was, correct answer, subj answer, reaction time
            // truth==a : if true answer and subj answer are ==, response logged as true, else, false
            
            if(document.fullscreenElement){isFullscreen = true;}else{isFullscreen = false;}
            qLog.push([subj,time,machine.name,q,truth,a,truth==a,rt,screenInteractions,isFullscreen]);
        }
        
        function endTrial(){
            logQ(currentMachine,q,truth,a,rt);
            
            ii+=1; // next trial
            currentMachine = machineQorder[ii]; // grab next machine
            $machineQimg.attr('src',currentMachine.image); // update display image
            // populate question field
            q = 'p'; // update question indicator - back to probabilistic
            $sliderDisplay.css('display','none');
            $machineQ.html(pPrompt); // update ? prompt
            $machineA.html(pAnswers); // and answer options
            $machineA.css('display','inline');
            // get correct response based on value field of machine
            if(currentMachine.value.length==1){truth=0;}else{truth=1;} // if one value, non-probabilistic machine => 0; else, probabalistic => 1;
        }
        
        function endQuestions(){
            questionsCompleted = true;
            console.log('end of questions, onto memory');
            setInstructions(instructions_memory);
                displayInstructions(0);
        }
        
        // get current selection
        function getSelection(selection){a=selection;selectionMade=true;}
            
        // highlight selection
        function highlightSelection(){
            $('.aText').removeClass('highlight'); // remove highlight from any current highlighted option
            $("#a"+a).addClass('highlight');  // add to current selection
        }
        
        /* go through each presented machine, ask questions:
        * 1. probabilistic or not
        * 2. points rewarded ('when not 0')
        * 3. if probabilistic, how often % 0 outcome
        */
        
        // responses will be logged to:
        //qlog = [['subject','time','machine','question','response','correct','rt']],
        
        // jquery handles
        var $machineQimg = $('#machineQimg'),
            $machineQ = $('#machineQ'),
            $machineA = $('#machineA'),
            $sliderDisplay = $('#sliderDisplay'),
            $slider = $('#fSlider'), // slider answer for frequency question
            $sliderValue = $('#sliderValue'); // slider value display
            
        $slider.on('input',function(){
            $sliderValue.html(this.value);
        });
            
        var selectionMade = false; // boolean controller for answer selection / lock in
        
        // question prompts
        var pPrompt = '<span id="q">Did this machine always give you the same number of points,'+ 
                       ' or did it sometimes give 0 points and sometimes give you more points?</span>',
            vPrompt_nonP = '<span id="q">How many points did this machine give you each time you chose it?</span>',
            vPrompt_P = '<span id="q">How many points did this machine give you when it did not give 0 points?</span>',
            fPrompt = function(va){return '<span id="q">For every 10 times you chose this machine, how many times did you get 0 instead of '+va+' points?</span>';};
            
        // answer options
        var pAnswers = '<ul style="display:inline-block; list-style-type:none"><li id="a0" class="aText">5: Always the same number of points</li>'+
                       '<li id="a1" class="aText">6: Sometimes 0 points, sometimes more points</li></ul>',
            vAnswers = '<ul style="display:inline-block"><li id="a0" class="aText">5: 0 points</li>'+
                        '<li id="a20" class="aText">6: 20 points</li><li id="a40" class="aText">7: 40 points</li> <li id="a80" class="aText">8: 80 points</li>';
            
            
        // switch display screen
        $screens.css('display','none'); // turn off all displays
        $qDisplay.css('display','inline'); // turn on question screen display
        
        
        // shuffle machine order
        machineQorder = shuffle(machines);
        ii = 0; // set trial counter to 0
        
        // set up first question
        var currentMachine = machineQorder[ii]; // grab first machine
        $machineQimg.attr('src',currentMachine.image); // display image
        $machineQimg.css('display','inline'); // turn on display
        // populate question field
        q = 'p'; // first question asks whether probabalistic machine or not
        $machineQ.html(pPrompt);
        $machineA.html(pAnswers);
        
        trialStart = time;
        // get correct response based on value field of machine
        if(currentMachine.value.length==1){truth=0;}else{truth=1;} // if one value, non-probabilistic machine => 0; else, probabalistic => 1;
        // set up first question
        
        
        // on key press
        $(document).on('keyup',function(e){
            if(!questionsCompleted){ // turn off key presses once questions are completed
                
                // * * Probabilistic question * *
                if(q=='p'){
                    if(keyPress == 53){ // 5
                        getSelection(0); highlightSelection();
                    } else if (keyPress == 54){ // 6
                        getSelection(1); highlightSelection();
                        
                    } else if (keyPress == 32 && selectionMade){ // selection locked in
                        rt = time-trialStart; // current time - time of trial start
                        selectionMade = false; // after selection made, turn boolean back to false (for next selection)
                        pa = a; // temporarily store probabilistic answer
                        logQ(currentMachine,q,truth,pa,rt); // log response
                        
                        // set up value question
                        q='v';
                        $machineA.html(vAnswers); // populate answer field
                        // populate queston;  if participant indicated non-probabilistic (0), else probabilisitc
                        if (pa==0){$machineQ.html(vPrompt_nonP);
                        } else {
                            $machineQ.html(vPrompt_P);
                            $('#a0').css('display','none'); // hide 0 value answer prompt}
                        }
                        trialStart = time; // start trial timer
                            
                    }
                    
                // * * Value question * *
                } else if (q=='v'){
                    // get true answer
                    truth = currentMachine.value[currentMachine.value.length-1]; // get last value from machines value array
                    
                    
                    if(keyPress == 53 && pa==0){ // 5 eg option 0 (only available during non-probabilistic assessment)
                        getSelection(0);highlightSelection();
                        
                    } else if (keyPress == 54){ // 6 - option 1
                        getSelection(20);highlightSelection();
                        
                    } else if (keyPress == 55){ // 7 - option 2
                        getSelection(40);highlightSelection();
                        
                    } else if (keyPress == 56){ // 7 - option 2
                        getSelection(80);highlightSelection();
                        
                    } else if (keyPress == 32 && selectionMade){ // selection locked in
                        rt = time-trialStart;
                        selectionMade = false;
                        va = a;
                                
                        
                        // set up next question
                        // if indicated machine was probabilistic, move on to frequency q (how often not 0), else, next machine
                        
                        if (pa==1){ // probabilistic answer indicated probabilistic machine
                            logQ(currentMachine,q,truth,a,rt); // log response
                            $('.aText').removeClass('highlight'); // remove highlights
                            q='f'; // update question indicator - frequency of non-0 outcome
                            $machineQ.html(fPrompt(va)); // update ? prompt - get reported machine value from [array of possible values][selection]
                            $machineA.css('display','none');
                            $sliderDisplay.css('display','inline'); // turn on slider display
                            $slider.focus(); // bring slider into focus if user wants to use key presses
                            if(currentMachine.value.length==1){ // if non-probabilistic machine
                                truth='n/a';}else{truth='5';} // no true frequency; else, truth is 5 (50%)
                            
                            
                            
                        } else { // non-probabilistic machine, can move onto next trial 
                            if(ii==machineQorder.length-1){ // if last machine was last machine, end question section
                                logQ(currentMachine,q,truth,a,rt);
                                endQuestions();
                            } else { // else go to next machine
                                endTrial(); // log responses, updates trial, starts next prompt
                                trialStart = time; // reset trial timer
                                
                            }
                        }
                    $('#a0').css('display','inline'); // return 0 value answer option for next machine (will be hidden again if idicate machine is probabilis)
                    trialStart = time; // start trial timer 
                    }
                // * * Frequency question * *    
                } else if (q=='f'){
                    
                    if(keyPress == 39 || keyPress == 37){
                        $slider.focus(); // bring slider into focus if user wants to use key presses
                        
                    }
                    if(keyPress == 32 && $slider.val()!=0){ // locking in selection
                        rt = time-trialStart;
                        fa = a = $slider.val(); // update answer selections
                        if(ii==machineQorder.length-1){ // if last machine was last machine, end question section
                            logQ(currentMachine,q,truth,a,rt);
                            endQuestions();
                        } else { // else go to next machine
                            selectionMade = false;
                            $slider.val(0); // reset slider
                            $sliderValue.html('');
                            endTrial();
                            trialStart = time; // reset trial timer
                        }
                        
                    }
                }
            
            }
            
        });
        
        
    }
    
    
    //@3   *  *  *  *  *  *  *  *  *  *  *  *  *  *
    // ** ** ** **  OLD/NEW RECOGNITION MEMORY TEST ** **  ** **
    //   *  *  *  *  *  *  *  *  *  *  *  *  *  * 
    
    function endMem(){
        
        
        
        $screens.css('display','none'); // turn off all displays
                    
                    
                    // populate final slide
        var finalLog = dataLog.concat(qLog,memLog);
        let csvContent = "data:text/csv;charset=utf-8,"+ finalLog.map(e => e.join(",")).join("\n");
        // so far JSON.stringify(finalLog.join("\n")); seems to have most managable output
        var pavData = csvContent;
                
        var encodedUri = encodeURI(csvContent);
        console.log(pavData);
        //pav._finish(pavData);
        
        $instructions.html("Great job! That's the end of the memory game. <br> Click the link below to continue on to the next part of the study, where you will be asked some questions about how feel."+
                            "<br><a id='questionnaireLink' href='javascript:void(0)'>Continue Study</a>"+
                            "<br><a id='almData' download='alm_data_"+subj+"_"+String(time)+"'>Download Data</a>"
                            );
        $('#almData').attr("href",encodedUri);
        
        
        // turn on display
        $('*').css('cursor','default'); 
        $infocont.css('display','inline');
        
        
        // redirect
        $('#questionnaireLink').click(function(){
            window.alert('You are being redirected to the next part of the study. Please wait. If you are not redirected in 10 seconds, contact the experimenter.');
            $instructions.html('Please wait while we redirect you to the next part of the study.<br>If you are not redirected in 10 seconds, contact the experimenter.');
            setTimeout(function(){
                window.location.replace("https://nyu.qualtrics.com/jfe/form/SV_8DfNxx5kL7TnH6Z?s4_="+subj);
            },5000);
            setTimeout(function(){
              $instructions.html('There seems to have been an error with redirecting you to the next part of the study- Sorry!<br>'+
                                   'Please contact the Hartley Lab for assistance.');
            },10000);
            
        });
    }
    
    function logMem(){
        
        //subject	time	trialN	image	correctResponse	userResponse	userConfidence	userCorrect	nClicks_mem	confidence	rTmem
        if(trialImage.seen){trialImage.seen = 'old';}else{trialImage.seen='new';}
        var userResponse, userConfidence;
        [userConfidence, userResponse] = memSelect.split(' '); // memSelect = "probably old", split into "probaby" + "old"
        
        
        if(document.fullscreenElement){isFullscreen = true;}else{isFullscreen = false;}
            
        memLog.push([subj, time, trialN, trialImage.image, trialImage.seen,  userResponse, userConfidence, trialImage.seen==userResponse,+
                     trialImage.trial, trialImage.outcome, nClicks_mem,rt_mem,screenInteractions,isFullscreen]);
        }
    
    
    function oldNew(imageList){
        
        
        memSelect = undefined; memSelector = Number; // decalre local variables for selection
        
        var imgOrder = shuffle(Array.from(Array(imageList.length).keys()));
        trialN = 0; // reset trial counter
        var canChoose = true; // allow key press
        
        var autoSelect; // debugging auto selector
        
                
        // display imageList[trialN]
        trialImage = imageList[imgOrder[trialN]];
        $memImage.attr('src','./rsrl_memoryImages/'+trialImage.image);
        $infocont.css('display','none');
        $stimDisplay.css('display','none');
        $outcome.css('display','none');
        $memFix.css('display','none');
        $oldnew.css('display','inline');
        trialStart = time;
        
        if (subj=='999'){ // autmoate selection
            
            memWait = 10;
            autoSelect = setInterval(function(){ // on 50ms interval...
                memSelector = [0,1,2,3,4,5][Math.floor(Math.random() * 6)]; // randomly select value 0:5
                memSelect = confidenceOptions[memSelector]+' '+memOptions[memSide[Math.round(memSelector/5)]];
                keyPress = 32; // hit spacebar
                if(canChoose){
                $(document).keyup(); // initaite key press
                }
            },10);
        }
        
        $(document).on('keyup',function(e) { // on keypress
            if(subj=='999'){keyPress=32;}
            
            if(memSelector!=Number){ 
                choiceHighlight.map(x=>$('#'+x).removeClass('highlight')); // on each trial, remove previous selection highlight
            }
                
                
            if(keyPress == 81 && canChoose == true){ // q -- move selector left
                if(memSelector==Number){memSelector=2;} // if first time, start maybe left
                else if(memSelector>0){memSelector--;}
            }else if (keyPress == 80 && canChoose == true){ // p -- move selector right
                if(memSelector==Number){memSelector=3;} // first time, start maybe right
                else if( memSelector<5){memSelector++;}
                        
            }else if (keyPress == 32  && Number.isInteger(memSelector) && !memoryCompleted){ // space -- lock in choice
                canChoose = false; // disable key presses until next frame is ready
                rt_mem = time-trialStart; // get time to make selection
                        
                logMem(); // log selection
                $('#displaySelection').html(''); // remove selection text
                    
                        // reset tracker variables, display
                nClicks_mem = 0; 
                $memImage.css('display','none'); // remove image
                $memFix.css('display','inline'); // display fixation
                choiceHighlight.map(x=>$('#'+x).removeClass('highlight')); // remove highlight - redundant?
                trialN++; // update trial counter
                console.log('img # ',trialN);
                memSelect = undefined; memSelector = Number;
                sourceSelect = undefined; sourceSelector = Number;
                        
                // END OF MEMORY
                // check if last slide
                if(trialN==imageList.length){
                    if(subj=='999'){clearInterval(autoSelect);}
                    canChoose = false;
                    memoryCompleted = true;
                    endMem();
                } else{
                            
                trialImage = imageList[imgOrder[trialN]]; // get next trial image
                $memImage.attr('src','./rsrl_memoryImages/'+trialImage.image); // assign it to html var
                            
                    setTimeout(function(){ // after memWait time...
                        $memFix.css('display','none'); // remove fixation
                        $memImage.css('display','inline'); // display new image
                        trialStart = time; // start timer
                        canChoose = true; // enable key press
                        },memWait);
                            
                }
                        
            }
                
            // the below execute on every keypress
            memSelect = confidenceOptions[memSelector]+' '+memOptions[memSide[Math.round(memSelector/5)]];
            let mtd = memOptions[memSide[Math.round(memSelector/5)]];
            $('#'+choiceHighlight[memSelector]).addClass('highlight');
            if(memSelector!=Number){
              nClicks_mem++;
                $('#displaySelection').html(confidenceOptions[memSelector]+' '+memText[memOptions.indexOf(mtd)]);
                $('#displaySelection').css('margin-left','-'+($('#displaySelection').width()/2)+'px');
            }
            
        }); // end keypress
    }
    
    
    //******************************
    //****** Behind the scenes *****
    //******************************
    
    
    // check screen orientation
    if ($(window).height()>$(window).width()){
        console.log('Portrait display- Mobile device?');
    } else {
        console.log('Landscape display- desktop?');
    }
    
    
    // if window is resized, update positions
    window.addEventListener('resize', function(){
        var winHeight = window.innerHeight,
        winWidth = window.innerWidth;
    });
    
    //****************************
    //***** USER INTERACTION *****
    //****************************
    
        
        // INSTRUCTIONS @4
        
    var instructions_practice = [
    // Here's where you put the instructions. Each index is a slide,
    // "," outside of string for new index/slide, if long string, can use "+" to join across lines ("a"+"b" == "ab")
    // Html tags are treated as such, e.g., <br> creates a line break, <b></b> bold, <img> image, etc.
    // If a slide has multiple elements, enclose in square brackets ['string','<img>']
        
            '<h1>Welcome to the point Machine Game!</h1> <br>'+
            "First, let's walk through some instructions. Whenever you see the blinking circle in the bottom right, you can"+
            ' use the arrow keys to go forward or backwards. Press the RIGHT ARROW key to go to the NEXT page of instructions.',
            
            ['Before we start, please set your browser to full screen mode. You can click on the button below to do so:<br><br>',
             '<button id="fullscreenButton_inst" class="text" onclick="document.documentElement.requestFullscreen();">Enter Fullscreen Mode</button>',
             '<br><br> Please keep the browser in full screen mode throughout the study.'],
             
                        'In this game, you will make choices between machines that give you different '+
            'amounts of points.<br> At the end of the study, you will win bonus money based on the amount of points you won!<br><br> '+
            'Press the RIGHT ARROW key to go to the NEXT page.',
             
             ['Point machines will look like this:',
              '<img class="center instructStim" src="./rsrl_images/machineP1.png" style="margin-left:-500px; top:35%">',
              '<img class="center instructStim" src="./rsrl_images/machineP2.png" style="margin-left: 200px;  top:35%">'],
             
                        'For each choice, you will pick one of two point machines. '+
             'To pick the machine on the left, press the Q key with your LEFT pointer finger. To pick'+
             ' the machine on the right, press the P key with your RIGHT pointer finger. ',
             
              [          'After you make a selection, the machine you chose<br> will be outlined. '+
             '<br>This is what you would see if you pressed "Q" to choose the machine on the left.',
             
             '<img class="selected center instructStim" src="./rsrl_images/machineP1.png" style="margin-left:-500px; top:50%">',
              '<img class="center instructStim" src="./rsrl_images/machineP2.png" style="margin-left:200px; top:50%">',],
             
                        ['Next, the machine you chose will give you a ticket like this:',
            "<span id='points' class='center stim' style='margin-top:82px;margin-left:-12px;padding:0px 10px 0px 10px;top:15%'>1</span>",
            '<img class="instructStim center unselectable" src="./rsrl_images/ticket.png" style="height:400px;margin-left:-320px;margin-top:50px;top:15%">',
            '<img class="instructStim center unselectable", src="./rsrl_images/pImg.png" style="height:200px; margin-top:150px;margin-left:-100px;top:15%">'],
                        
                        ['Each ticket will have a picture... ',
            "<span id='points' class='center stim' style='margin-top:82px;margin-left:-12px;padding:0px 10px 0px 10px;top:15%'>1</span>",
            '<img class="instructStim center unselectable" src="./rsrl_images/ticket.png" style="height:400px;margin-left:-320px;margin-top:50px;top:15%">',
            '<img class="instructStim center unselectable highlight", src="./rsrl_images/pImg.png" style="height:200px; margin-top:150px;margin-left:-100px;top:15%">'],
                        
                        
                        ['As well as tell you how many points you won from the machine you chose.',
            "<span id='points' class='center stim highlight' style='margin-top:82px;margin-left:-12px;padding:0px 10px 0px 10px;top:15%'>1</span>",
            '<img class="instructStim center unselectable" src="./rsrl_images/ticket.png" style="height:400px;margin-left:-320px; margin-top:50px;top:15%">',
            '<img class="instructStim center unselectable", src="./rsrl_images/pImg.png" style="height:200px; margin-top:150px;margin-left:-100px;top:15%">'],
             
                        'Your job is to get as many points as you can, because your bonus money '+
             'is based on the number of points you win! <br><br>Next, the ticket will disappear '+
             'and you will see two more machines to choose from.',
                        
                        ['Sometimes you will see only one machine on the screen. When that happens'+
            ', you should still press the Q or P key to pick that machine.',
            
             '<img class="center instructStim" src="./rsrl_images/machineP1.png" style="margin-left:-500px; margin-top:-100px">'],
                        
                        'You will have 3 seconds to pick a machine. If you do not pick within 3 seconds,'+
             ' that round will be over. <br>You will get 0 points for that round and you will not'+
             ' get another chance to make that choice. The game will then move on to the next round.',
                        
                        "Now let's practice choosing machines.<br> This is only a practice, "+
             'so the points you earn will not affect your bonus money at the end of the study. However, you will need to do well in the practice before progressing onto the main task, so try your best! '+
             '<br><br>Get your fingers ready on the Q and P keys, then press either Q or P to begin the practice trials!'];
    
    var instructions_main = [
             
        'You might have noticed that one of the machines during the practice game always gave you 1 point, '+
            'while the other machine sometimes gave you 2 points but sometimes gave you 0 points.',
             
        'In the real game, there are 5 different machines. <br>Some machines will always '+
            'give you the same number of points, and other machines will sometimes give '+
            'you a lot of points, but sometimes give you 0 points.',
            
        'During the practice, each ticket had a star on it. In the real game, each ticket will have a different picture.',
        
        'Although the points did not matter in the practice game, '+
             'in the real game the points you get will influence the amount '+
             'of bonus money you get at the end of the study.',
             
        'Once we begin the game, you will make many choices in a row. <br>Every '+
             'once in awhile, you will be able to take a short break. During the break, '+
             'you will see your total number of points so far, and when you are ready, you can press the Q or P '+
             'key to start the game again.',
             
        'Remember, you want to get as many points as possible because '+
             'your bonus money at the end of the study is based on the amount of points you win.',
             
        'This is the last slide before the game starts! Once the game starts, it will take about twenty minutes to finish.'+
             '<br><br>Get your fingers ready on the Q and P keys, then press either Q or P to begin the game!'
    
    ];
    
    var instructions_questions = [
                                   
        "Now we will ask you a few questions about how many points each machine gave you.",
        
        'To indicate your response, you will press a number key at the top of your keyboard to make a selection.<br>'+
        'For example, you will see a question, and then a few options as answers labeled as:<br><br>'+
        '<ul style="display:inline-block"><li>5: option 1</li><li>6: option 2</li>',
        
        'To select <i>option 1</i> as your answer, you would hit the 5 key on your keyboard.<br>'+
        'To select <i>option 2</i> as your answer, you would instead hit the 6 key on your keyboard.<br><br>'+
        '<ul style="display:inline-block"><li>5: option 1</li><li>6: option 2</li>',
        
        'Once you hit a key, that answer will be highlighted.<br> If you are happy with your selection, you can press the space bar to lock in your choice.<br><br>'+
        '<ul style="display:inline-block"><li class="highlight">5: option 1</li><li>6: option 2</li>',
        
        'For some questions, you will answer by using a slider bar that looks like this:<br><br>'+
        '<input type="range" min="0" max="10" value="0" class="slider" onkeydown="return false;"style="position:absolute;width:600px;top:65%;left:50%;margin-left:-300px;" >',
        
        'To make your response on these questions, you can either use your mouse or the arrow keys to move the slider.<br>'+
        'Feel free to practice using the mouse on the slider bar below!<br>'+
        '<input type="range" min="0" max="10" value="0" class="slider" onkeydown="return false;" style="position:absolute;width:600px;top:65%;left:50%;margin-left:-300px;">',
        'Once you are happy with the location of the slider, you can press the space bar to lock in your choice.'+
        '<input type="range" min="0" max="10" value="0" class="slider" onkeydown="return false;"style="position:absolute;width:600px;top:65%;left:50%;margin-left:-300px;">',
        
        'Please take your time when answering to make sure you select the option you want - you will not be able to change this answer later.',
        
        '<br>When you are ready, press any of the number keys on your keyboard to start.'
        
    ];
    
    var instructions_memory = [
        "Great! That is the end of that section. <br><br> In the next part, you will play a memory game "+
            'where you will be shown pictures one at a time.<br><br> For each picture, you will be asked whether you saw or did NOT see the picture on one of the tickets you received in the slot machine game.',
             
        'At the same time, you will tell us how sure you are that you saw the picture or not.<br> '+
            'You will be able to tell us if you think you:<br> <ul style="display:inline-block"> <li>Maybe</li><li>Probably </li>'+
            '<li> <i>or</i> Definitely</li></ul><br> saw the picture or did NOT see the picture.',
            
        'If you think you saw the picture on a ticket, press the '+oldKey+' key.<br><br>'+
        
        'If you think you did NOT see the picture on a ticket, press the '+newKey+' key.',
        
        'The more you press either key, the more sure you are of your answer.',
        
        'For example, if you think that you MAYBE saw the picture on a ticket, you would hit '+oldKey+' once.<br><br>'+
        
        'On the other hand, if you think that you DEFINITELY did NOT see the picture on a ticket, you would hit '+newKey+' 3 times.<br><br>'+
        
        'If you want to change your answer, you can use the Q and P keys to move between the different options.',
        
        "When you are happy with your selection, press the space bar to lock in your choice. <br><br> Let's practice!",
        //qq
        
        ["<span id='inlineInst' href='definitely new'>Let's pretend that you DEFINITELY did NOT see this image during the main game. In that case, select 'definitely didn&#39;t see'</span>",
         '<img class="instructStim center unselectable", src="./rsrl_images/pImg.png" style="height:200px; margin-top:-100px;margin-left:-100px">',
         '<span class="stim center leftMem text" style="margin-left:-330px;margin-top:-50px">'+memText[memSide[0]]+'</span>',
         '<span class="stim center rightMem text" style="margin-left:280px;margin-top:-50px">'+memText[memSide[1]]+'</span>',
         '<div id="left_def" class="stim center leftMem"></div><div id="left_prob" class="stim center leftMem"></div><div id="left_maybe" class="stim center leftMem"></div>',
         '<div id="right_def" class="stim center rightMem"></div><div id="right_prob" class="stim center rightMem"></div><div id="right_maybe" class="stim center rightMem"></div>',
         '<span id="displaySelection" class="stim center"></span>',
         '<span id="directionPrompt" class="stim center text" style="position:absolute;width:200px;top:90%;left:50%;margin-left:-120px;">&#x2190;Q&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;P&#x2192;</span>',
        "<p id=tryAgain style='visibility:hidden'>Please select 'definitely didn&#39;t see' and then hit the space bar to continue.</p>",
        ],
        
        ["<span id='inlineInst' href='maybe old'>Nice! Let's pretend that you think you MAYBE saw this image during the main game. In that case, select 'maybe saw'</span>",
         '<img class="instructStim center unselectable", src="./rsrl_images/pImg.png" style="height:200px; margin-top:-100px;margin-left:-100px">',
         '<span class="stim center leftMem text" style="margin-left:-330px;margin-top:-50px">'+memText[memSide[0]]+'</span>',
         '<span class="stim center rightMem text" style="margin-left:280px;margin-top:-50px">'+memText[memSide[1]]+'</span>',
         '<div id="left_def" class="stim center leftMem"></div><div id="left_prob" class="stim center leftMem"></div><div id="left_maybe" class="stim center leftMem"></div>',
         '<div id="right_def" class="stim center rightMem"></div><div id="right_prob" class="stim center rightMem"></div><div id="right_maybe" class="stim center rightMem"></div>',
         '<span id="displaySelection" class="stim center"></span>',
         '<span id="directionPrompt" class="stim center text" style="position:absolute;width:200px;top:90%;left:50%;margin-left:-120px;">&#x2190;Q&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;P&#x2192;</span>',
        "<p id=tryAgain style='visibility:hidden'>Please select 'maybe saw' and then hit the space bar to continue.</p>",
        ],
        
        ["<span id='inlineInst' href='probably new'>Great! Now, let's pretend that you think you PROBABLY did NOT see this image during the main game. In that case, select 'probably didn&#39;t see'</span>",
         '<img class="instructStim center unselectable", src="./rsrl_images/pImg.png" style="height:200px; margin-top:-100px;margin-left:-100px">',
         '<span class="stim center leftMem text" style="margin-left:-330px;margin-top:-50px">'+memText[memSide[0]]+'</span>',
         '<span class="stim center rightMem text" style="margin-left:280px;margin-top:-50px">'+memText[memSide[1]]+'</span>',
         '<div id="left_def" class="stim center leftMem"></div><div id="left_prob" class="stim center leftMem"></div><div id="left_maybe" class="stim center leftMem"></div>',
         '<div id="right_def" class="stim center rightMem"></div><div id="right_prob" class="stim center rightMem"></div><div id="right_maybe" class="stim center rightMem"></div>',
         '<span id="displaySelection" class="stim center"></span>',
         '<span id="directionPrompt" class="stim center text" style="position:absolute;width:200px;top:90%;left:50%;margin-left:-120px;">&#x2190;Q&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;P&#x2192;</span>',
        "<p id=tryAgain style='visibility:hidden'>Please select 'probably probably didn&#39;t see' and then hit the space bar to continue.</p>",
        ],
        
            
        "Good job! <br>When you are ready to begin the real game, press the spacebar to start.\n There is no time limit, however "+
            "if you are not sure, just make your best guess."
        
        
   ];
    
    var instructions_bookgdbd = [
        "That is the end of the game, great job! <br><br> In the next part of the study, you will be asked to fill out some questionnaires related to"+
        "behavior and feelings, such as how you feel and how often you do certain behaviors.",
        
        "To continue onto that part of the study, please clink the link below.<br><br>"+
        "<a href='qualtrics link'>Fill out questionnaires</a>"
    ];
    
    // here's where you would put the functions taht the user has access too - key presses, buttons, etc.
    
    // add function to control instructions
    // right arrow key, go forward, left, go back, if first time on an instruction page, wait 2s
    // track keyPresses
    
    // display slide
    // after timer, allow next slide
    
    var navSlides = function(slide,keyPress,wait){
            if(wait == false){
                if(keyPress == 37){ // left arrow
                        if(slide!=0 ){
                            slide--;
                            wait = true;}
                } else if(keyPress == 39){ // right arrow
                    if(slide!=instructions.length-1){
                            slide++;
                            wait = true;
                    }
                }
            }
            if(slideVisited[slide]==1){wait=false;}
            return [slide,wait];
        },
            
    nextSlide = function(){
                [slide, wait] = navSlides(slide,keyPress,wait);
                $instructions.html(instructions[slide]);
                wait = false;
        },
                
        
    
    setInstructions = function(newInstructions){
        instructions = newInstructions;
        slideVisited = new Array(instructions.length-1).fill(0);
    };
    
    var displayInstructions = function(startSlide){
        
        //checkFullscreen();
        
        $('*').css('cursor','default'); // turn cursor on
        slide = startSlide; // set first slide to input value
        
        if(subj=='999'){
            slide = instructions.length-1;} // if bug checking task, skip to last slide
        
        $screens.css('display','none'); // turn off all displays
        $infocont.css('display','inline'); // turn on info display
        $navi.css('display','inline'); // turn on navigator graphic
        reading = true; // allow 
        memSelector = Number; // *DDelete?
        
        $instructions.html(instructions[slide]); // starting slide 
        
        if(slide == titleSlide){
            setTimeout(function(){
            slideVisited[slide] = 1;
            wait = false;
        },500); // title slide, don't need to read
        }
        
        checkSlide = setInterval(function(){ // probably a resource hog method, but checks if 4x/sec if slide has been read. some event check/on update probably better but this was quicker to implement
            if(slideVisited[slide]){$navi.css('visibility','visible');}else{$navi.css('visibility','hidden');}
        },250);
        
    };
    

    
    var practice = function(){
        //practice
        $infocont.css('display','none');
        var trial,
            date = new Date(),
            startTime = date.getTime(),
            stimPresent = 3000,
            iti;
            
        
        // recursive funciton, once initiated, will run until trialN == nPtrials
        nTrials = nTrials_p;
        block = pTrials.blocks[0];
        trialN = 0; 
        console.log('start practice');
        fixation(block);
    };
    
    var mainTask = function(){
        // main
        $infocont.css('display','none'); // turn off instructions
        pointsTotal = 0;
        nTrials = nTrials_main;
        block = trials.blocks[blockInd];
        trialN = 0;
        fixation(block);
    };
    
    
    
    
    // Execute! #5
    
    // debug subs:
    if(subj=='666'){ // jump to section debug
        practiceCompleted = true;
        taskCompleted = true;
        questionsCompleted = true;
        setInstructions(instructions_memory);
        displayInstructions(0);
        readTime = 10;
    //displayInstructions(instructions_memory,14);
    } else if (500<subj && subj<600){ // task debug - few trials=);
      console.log('ss ',subj);
        nTrials_p = 6;
        nTrials_main = 20; // number of trials to be presented per block,
        readTime = 10;
        imageList = imageList.slice(0,(nTrials_main*3)*1.5); // images == number of trials, + 50% for foils
        
        setInstructions(instructions_practice);
        displayInstructions(0);
        
    // normal sub    
    }else if (subj){
    setInstructions(instructions_practice);
    displayInstructions(0);
    // invalid sub id
    }else{
    setInstructions(instructions_practice);
    displayInstructions(0);
    }
  
    
};


//$(document).ready(main());

$(window).on('load', function() {
    loadContent();
    //main();
});