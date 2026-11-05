import express from 'express';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import User from '../models/User.js';
import {demoAuth} from '../middleware/auth.js';
import crypto from 'crypto';
const router=express.Router();let demo=[];const demoAttempts=[];
const connected=()=>process.env.MONGODB_URI&&Assessment.db.readyState===1;
const mentorOnly=(req,res,next)=>req.user?.role==='mentor'||req.user?.role==='admin'?next():res.status(403).json({error:'Mentor access required'});
const publicAssessmentSummary=a=>({id:a.id||a._id,_id:a._id,title:a.title,subject:a.subject,phase:a.phase,topic:a.topic,difficulty:a.difficulty,description:a.description,duration:a.duration,totalMarks:a.totalMarks,status:a.status,isActive:a.isActive,uniqueToken:a.uniqueToken,startDate:a.startDate,endDate:a.endDate,maxAttempts:a.maxAttempts,oneAttemptPerEmail:a.oneAttemptPerEmail});
const studentAssessment=a=>{const data=typeof a?.toObject==='function'?a.toObject():{...a};const {allowedEmails,...safe}=data;safe.questions=(safe.questions||[]).map(question=>{const {correctAnswer,expectedAnswer,evaluationGuidelines,referenceFlowchart,...studentQuestion}=question;return studentQuestion});return safe};
const availabilityError=(assessment)=>{const now=new Date();if(assessment.status==='closed')return 'This assessment is closed. Please contact your mentor.';if(!assessment.isActive)return 'This assessment is currently unavailable. Please contact your mentor.';if(assessment.startDate&&now<new Date(assessment.startDate))return 'This assessment has not started yet.';if(assessment.endDate&&now>new Date(assessment.endDate))return 'This assessment has ended. Please contact your mentor.';if(assessment.linkExpiresAt&&now>new Date(assessment.linkExpiresAt))return 'This assessment link has expired. Please contact your mentor.';return null};
const normalizeAllowedEmails=(emails)=>[...new Set((Array.isArray(emails)?emails:typeof emails==='string'?emails.split(/[\n,;]/):[]).map(email=>String(email||'').trim().toLowerCase()).filter(email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
const buildFallbackFeedback = ({assessment,questionResults=[]}) => {
  const gaps=[]; const strengths=[];
  const hasGap=questionResults.some(item=>item.correct===false||item.correct===null);
  const hasStrength=questionResults.some(item=>item.correct===true);
  if(hasStrength)strengths.push(`You show developing competence in ${assessment.topic||assessment.subject||'the assessed concepts'}.`);
  if(hasGap)gaps.push(`Strengthen core concepts in ${assessment.topic||assessment.subject||'this assessment'} through guided examples and practice.`);
  if(!strengths.length)strengths.push(`Keep building conceptual understanding in ${assessment.topic||assessment.subject||'this topic'}.`);
  if(!gaps.length)gaps.push(`Continue applying ${assessment.topic||assessment.subject||'the covered concepts'} to new examples.`);
  return {summary:`Feedback for ${assessment.title||'the assessment'} focuses on concept gaps and practical next steps.`,strengths,gaps,nextSteps:[`Review ${assessment.topic||assessment.subject||'the assessment topics'} with examples.`,`Complete a short practice set before retaking or attempting another assessment.`,`Ask the mentor for help with topics marked as improvement areas.`]};
};
const generateStudentFeedback=async({assessment,questionResults=[]})=>{
  const prompt=`Create clear, supportive learner feedback for this assessment. Do not list which individual questions were correct or wrong. Do not expose correct answers. Focus on concepts mastered, gaps to improve, and actionable next steps. Return JSON only: {"summary":"...","strengths":["..."],"gaps":["..."],"nextSteps":["..."]}. Assessment: ${assessment.title||'Assessment'}, subject: ${assessment.subject||''}, topic: ${assessment.topic||''}. Detail: ${JSON.stringify(questionResults.map(item=>({question:item.text,type:item.type,studentAnswer:item.answer,correct:item.correct})))}`;
  try {
    const generated=await generateWithProvider({prompt});
    if(generated?.summary)return {summary:String(generated.summary),strengths:Array.isArray(generated.strengths)?generated.strengths.map(String):[],gaps:Array.isArray(generated.gaps)?generated.gaps.map(String):(Array.isArray(generated.improvements)?generated.improvements.map(String):[]),nextSteps:Array.isArray(generated.nextSteps)?generated.nextSteps.map(String):[]};
  } catch(error) { console.error('AI feedback unavailable:', error.message); }
  return buildFallbackFeedback({assessment,questionResults});
};
const cleanJson = (value) => {
  const text=String(value||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  return JSON.parse(text);
};
const generateWithProvider = async ({prompt}) => {
  if(process.env.GEMINI_API_KEY){
    const models=[process.env.GEMINI_MODEL,'gemini-3-flash-preview','gemini-3.5-flash','gemini-flash-latest'].filter(Boolean);
    let lastError='Gemini generation failed';
    for(const model of [...new Set(models)]){
      const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({generationConfig:{responseMimeType:'application/json',temperature:0.3},contents:[{parts:[{text:prompt}]}]})});
      if(!response.ok){
        const payload=await response.json().catch(()=>null);
        lastError=payload?.error?.message||`Gemini returned HTTP ${response.status}`;
        if([404,400].includes(response.status))continue;
        throw new Error(lastError);
      }
      const payload=await response.json();
      const text=payload.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'{"questions":[]}';
      return cleanJson(text);
    }
    throw new Error(lastError);
  }
  if(process.env.OPENAI_API_KEY){
    const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.OPENAI_API_KEY},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:0.3,response_format:{type:'json_object'},messages:[{role:'system',content:'You are an academic assessment feedback assistant. Return strictly valid JSON only.'},{role:'user',content:prompt}]})});
    if(!response.ok)throw new Error(`OpenAI returned HTTP ${response.status}`);
    const payload=await response.json();
    return cleanJson(payload.choices?.[0]?.message?.content||'{"summary":"","strengths":[],"gaps":[],"nextSteps":[]}');
  }
  return null;
};
router.post('/ai/generate',demoAuth,mentorOnly,async(req,res)=>{
  try {
    const {title,description,subject,difficulty,count,type,duration,instructions,prompt:mentorPrompt}=req.body; const outputMcq=type==='Flowchart Output (MCQ)'; const effectiveType=outputMcq?'MCQ':type;
    if(!title?.trim())return res.status(400).json({error:'Assessment title or topic is required'});
    const n=Math.min(50,Math.max(1,Number(count)||5));
    const fallbackFlowchartSvg=(question,answer)=>`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420" viewBox="0 0 700 420"><rect width="700" height="420" fill="#ffffff"/><rect x="275" y="30" width="150" height="55" rx="28" fill="#eaf2ff" stroke="#2563eb"/><text x="350" y="64" text-anchor="middle" font-size="18" font-family="Arial">Start: Input given</text/><line x1="350" y1="85" x2="350" y2="125" stroke="#68758a" stroke-width="3"/><polygon points="350,125 455,180 350,235 245,180" fill="#fff8e8" stroke="#b7791f"/><text x="350" y="185" text-anchor="middle" font-size="16" font-family="Arial"><![CDATA[Evaluate ${String(question).slice(0,55)}]]></text/><line x1="350" y1="235" x2="350" y2="280" stroke="#68758a" stroke-width="3"/><rect x="250" y="280" width="200" height="60" fill="#f0fdf4" stroke="#16a34a"/><text x="350" y="316" text-anchor="middle" font-size="17" font-family="Arial">Output: ${String(answer).slice(0,45)}</text><rect x="275" y="360" width="150" height="50" rx="25" fill="#eaf2ff" stroke="#2563eb"/><text x="350" y="392" text-anchor="middle" font-size="18" font-family="Arial">End</text></svg>`;
    const prompt=`Generate a real, topic-specific assessment about "${title}" in the subject "${subject||'General'}". Mentor assessment prompt: "${mentorPrompt||description||instructions||'None'}". Mentor description: "${description||'None'}". Do not use placeholders such as Concept A, Option A, or generic example questions. Create exactly ${n} questions at ${difficulty||'Beginner'} difficulty. Preferred type: ${effectiveType||'Mixed'}. Duration: ${duration||30} minutes. Additional instructions: ${instructions||'None'}. Assign place conceptual questions in MCQ and flowcharts, coding, HTML/CSS uploads in Task / Practical; Coding and Flowchart and HTML/CSS Upload questions must be Task / Practical. For Flowchart Output (MCQ), create only Multiple Choice questions. Each one must include a flowchart in flowchartSvg and ask what output/result occurs for the shown input. Do not return plain text alone for these questions. For MCQ questions that use flowchart output prediction, provide valid inline SVG flowchart markup in flowchartSvg. The flowchart must show the input and process clearly, and options must ask for the exact expected output. The questions must directly test the stated topic and each MCQ option and correct answer must be accurate for the topic. Return only valid JSON: {"questions":[{"text":"question","section":"MCQ|Task / Practical","answerType":"Multiple Choice|Multiple Select|Paragraph|Choose File","flowchartSvg":"optional valid inline SVG only for MCQ output-prediction flowcharts","type":"Multiple Choice|Multiple Select|Short Answer|Long Answer|Coding / Problem Solving|Flowchart|HTML/CSS Upload","marks":5,"difficulty":"${difficulty||'Beginner'}","options":["A","B","C","D"],"correctAnswer":"A","expectedAnswer":"answer","evaluationGuidelines":"guidelines"}]}. For MCQ, set options and correctAnswer matching one exact option. For Multiple Select, set correctAnswer as an array of exact option strings. For descriptive or coding questions, use an empty options array and provide expectedAnswer and evaluationGuidelines. Do not include Markdown, comments, or explanatory text outside JSON.`;
    const generated=await generateWithProvider({prompt});
    if(outputMcq&&generated?.questions)generated.questions=generated.questions.map((q,i)=>({...q,section:'MCQ',type:'Multiple Choice',flowchartSvg:q.flowchartSvg||fallbackFlowchartSvg(q.text||title,q.correctAnswer||`Option ${i+1}`)}));
    if(generated?.questions) return res.json(generated);
    const fallbackSvg=(label)=>`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420" viewBox="0 0 700 420"><rect width="700" height="420" fill="#ffffff"/><rect x="275" y="30" width="150" height="55" rx="28" fill="#eaf2ff" stroke="#2563eb"/><text x="350" y="64" text-anchor="middle" font-size="18" font-family="Arial">Start</text/><line x1="350" y1="85" x2="350" y2="125" stroke="#68758a" stroke-width="3"/><polygon points="350,125 455,180 350,235 245,180" fill="#fff8e8" stroke="#b7791f"/><text x="350" y="185" text-anchor="middle" font-size="16" font-family="Arial"><![CDATA[${label}]]></text/><line x1="350" y1="235" x2="350" y2="280" stroke="#68758a" stroke-width="3"/><rect x="250" y="280" width="200" height="60" fill="#f0fdf4" stroke="#16a34a"/><text x="350" y="316" text-anchor="middle" font-size="17" font-family="Arial">Expected output</text><rect x="275" y="360" width="150" height="50" rx="25" fill="#eaf2ff" stroke="#2563eb"/><text x="350" y="392" text-anchor="middle" font-size="18" font-family="Arial">End</text></svg>`;
    const questions=Array.from({length:n},(_,i)=>({text:`What is the correct output shown by the flowchart for ${title}?`,section:outputMcq?'MCQ':(type==='Flowchart'||type==='Coding / Problem Solving'||type==='HTML/CSS Upload'||type==='Task / Practical'||type==='Practical')?'Task / Practical':(i%3===2?'Practical':'Theory'),type:outputMcq?'Multiple Choice':type==='Flowchart'?'Flowchart':type==='MCQ'?'Multiple Choice':type==='Multiple Select'?'Multiple Select':'Short Answer',marks:5,difficulty:difficulty||'Beginner',flowchartSvg:outputMcq||type==='MCQ'||type==='Multiple Select'?fallbackFlowchartSvg(title.replace(/\n/g,' '),'The value produced after the flowchart processes the input'):undefined,options:outputMcq||type==='MCQ'||type==='Multiple Select'?['Option A','Option B','Option C','Option D']:[],correctAnswer:outputMcq||type==='MCQ'?'Option A':type==='Multiple Select'?['Option A','Option C']:'',expectedAnswer:'A correct explanation mentioning the relevant concept and a valid example.',evaluationGuidelines:'Check accuracy, completeness, and clarity.'}));
    res.json({questions,previewFallback:!process.env.GEMINI_API_KEY&&!process.env.OPENAI_API_KEY});
  }catch(e){res.status(502).json({error:e.message||'AI generation failed'})}
});
router.post('/ai/regenerate',demoAuth,mentorOnly,async(req,res)=>{
  try {
    const {question,topic,subject,difficulty,type}=req.body;
    if(!question?.trim())return res.status(400).json({error:'Question is required'});
    const prompt=`Rewrite and improve this assessment question for ${difficulty||'Beginner'} level. Subject: ${subject||'General'}. Topic: ${topic||subject||'General'}. Preferred type: ${type||'Multiple Choice'}. Original: "${question}". Return only valid JSON: {"question":{"text":"rewritten question","flowchartSvg":"optional valid inline SVG for an MCQ output-prediction flowchart","type":"${type||'Multiple Choice'}","marks":5,"difficulty":"${difficulty||'Beginner'}","options":["A","B","C","D"],"correctAnswer":"A","expectedAnswer":"answer","evaluationGuidelines":"guidelines"}}`;
    const generated=await generateWithProvider({prompt});
    if(generated?.question)return res.json(generated);
    const fallbackFlowchartSvg=(qText,ansText)=>`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420" viewBox="0 0 700 420"><rect width="700" height="420" fill="#ffffff"/><rect x="275" y="30" width="150" height="55" rx="28" fill="#eaf2ff" stroke="#2563eb"/><text x="350" y="64" text-anchor="middle" font-size="18" font-family="Arial">Start: Input given</text><line x1="350" y1="85" x2="350" y2="125" stroke="#68758a" stroke-width="3"/><polygon points="350,125 455,180 350,235 245,180" fill="#fff8e8" stroke="#b7791f"/><text x="350" y="185" text-anchor="middle" font-size="16" font-family="Arial"><![CDATA[Evaluate ${String(qText).slice(0,55)}]]></text/><line x1="350" y1="235" x2="350" y2="280" stroke="#68758a" stroke-width="3"/><rect x="250" y="280" width="200" height="60" fill="#f0fdf4" stroke="#16a34a"/><text x="350" y="316" text-anchor="middle" font-size="17" font-family="Arial">Output: ${String(ansText).slice(0,45)}</text><rect x="275" y="360" width="150" height="50" rx="25" fill="#eaf2ff" stroke="#2563eb"/><text x="350" y="392" text-anchor="middle" font-size="18" font-family="Arial">End</text></svg>`;
    return res.json({question:{text:`${topic||subject||'Assessment'}: Reworked question — ${question}`,type:type||'Multiple Choice',marks:5,difficulty:difficulty||'Beginner',flowchartSvg:type==='Multiple Choice'||type==='Multiple Select'?fallbackFlowchartSvg(String(topic||subject||'Assessment').replace(/\n/g,' '),'Result depends on the flowchart input'):undefined,options:type==='Multiple Choice'||type==='Multiple Select'?['Option A','Option B','Option C','Option D']:[],correctAnswer:type==='Multiple Select'?['Option A']:type==='Multiple Choice'?'Option A':'',expectedAnswer:'A clear, accurate answer with relevant supporting details.',evaluationGuidelines:'Check conceptual accuracy, completeness, and clarity.'}});
  }catch(e){res.status(502).json({error:e.message||'Question regeneration failed'})}
});
router.get('/',demoAuth,async(req,res)=>{try{if(req.query.status!=='published'||req.query.active!=='true')return res.status(403).json({error:'Only active published assessment summaries are public'});if(!connected())return res.json(demo.filter(x=>x.status==='published'&&x.isActive).map(publicAssessmentSummary));const assessments=await Assessment.find({status:'published',isActive:true}).select('title subject phase topic difficulty description duration totalMarks status isActive uniqueToken startDate endDate maxAttempts oneAttemptPerEmail').sort({createdAt:-1});return res.json(assessments)}catch(e){res.status(500).json({error:e.message})}});
router.get('/mentor/mine',demoAuth,mentorOnly,async(req,res)=>{try{if(!connected())return res.json(demo.filter(item=>String(item.mentor)===String(req.user.id)));res.json(await Assessment.find({mentor:req.user.id}).sort({createdAt:-1}))}catch(e){res.status(500).json({error:e.message})}});
router.get('/submissions/mentor',demoAuth,mentorOnly,async(req,res)=>{try{if(!connected())return res.json(demoAttempts.filter(a=>a.status==='Submitted').map((a,i)=>({...a,id:a.id||String(i),studentName:a.studentName,studentEmail:a.studentEmail,status:'Submitted'})));const assessments=await Assessment.find({mentor:req.user.id}).select('_id title totalMarks');const submissions=await Submission.find({assessment:{$in:assessments.map(a=>a._id)}}).populate('assessment','title totalMarks topic').sort({createdAt:-1});res.json(submissions.map(item=>({id:item._id,assessmentId:item.assessment?._id,title:item.assessment?.title,studentName:item.studentName,studentEmail:item.studentEmail,submittedAt:item.createdAt,status:item.status,score:item.result?.score||0,totalPossible:item.result?.totalPossible||item.assessment?.totalMarks||0,needsReview:item.result?.needsReview||false,result:item.result||{}})))}catch(e){res.status(500).json({error:e.message})}});
router.get('/student/submissions',demoAuth,async(req,res)=>{
  try{
    if(!req.user?.email||req.user.role!=='student')return res.status(403).json({error:'Student login required'});
    const studentEmail=String(req.user.email).trim().toLowerCase();
    if(!connected()){
      const items=demoAttempts
        .filter(a=>(a.status==='Submitted'||a.status==='Evaluated')&&String(a.studentEmail||'').trim().toLowerCase()===studentEmail)
        .map((item,i)=>({
          id:item.id||String(i),
          assessmentId:item.assessmentId,
          title:item.title||'Assessment',
          subject:item.subject||'',
          topic:item.topic||'',
          submittedAt:item.endTime||item.startTime||new Date(),
          status:item.status,
          score:item.result?.score??item.score??0,
          totalPossible:item.result?.totalPossible??item.totalPossible??0,
          needsReview:item.result?.needsReview??false,
          result:item.result||{},
          questionReview:item.result?.questionReview||[]
        }));
      return res.json(items);
    }
    const query={
      $or:[
        {studentEmail},
        ...(req.user.id?[{student:req.user.id}]:[])
      ]
    };
    const submissions=await Submission.find(query).populate('assessment','title totalMarks topic subject').sort({createdAt:-1});
    res.json(submissions.map(item=>({
      id:item._id,
      assessmentId:item.assessment?._id,
      title:item.assessment?.title||item.title||'Assessment',
      subject:item.assessment?.subject||'',
      topic:item.assessment?.topic||'',
      submittedAt:item.createdAt,
      status:item.status,
      score:item.result?.score??item.score??0,
      totalPossible:item.result?.totalPossible??item.assessment?.totalMarks??0,
      needsReview:item.result?.needsReview??false,
      result:item.result||{},
      questionReview:item.result?.questionReview||[]
    })));
  }catch(e){res.status(500).json({error:e.message})}
});
router.patch('/submissions/:id/feedback',demoAuth,mentorOnly,async(req,res)=>{
  try{
    const feedbackText=String(req.body.feedback||'').trim();
    if(!connected()){
      const attempt=demoAttempts.find(x=>String(x.id)===String(req.params.id));
      if(!attempt)return res.status(404).json({error:'Submission not found'});
      attempt.result=attempt.result||{};
      attempt.result.mentorFeedback=feedbackText;
      return res.json({message:'Feedback updated',mentorFeedback:feedbackText});
    }
    const item=await Submission.findById(req.params.id).populate('assessment','mentor');
    if(!item||String(item.assessment?.mentor||'')!==String(req.user.id))return res.status(404).json({error:'Submission not found or not owned by this mentor'});
    item.result=item.result||{};
    item.result.mentorFeedback=feedbackText;
    await item.save();
    res.json({message:'Feedback updated',mentorFeedback:item.result.mentorFeedback});
  }catch(e){res.status(400).json({error:e.message})}
});
router.delete('/submissions/:id',demoAuth,mentorOnly,async(req,res)=>{
  try{
    if(!connected()){
      const idx=demoAttempts.findIndex(x=>String(x.id)===String(req.params.id));
      if(idx<0)return res.status(404).json({error:'Submission storage is unavailable'});
      demoAttempts.splice(idx,1);
      return res.json({message:'Submission and stored feedback removed'});
    }
    const item=await Submission.findById(req.params.id).populate('assessment','mentor');
    if(!item||String(item.assessment?.mentor||'')!==String(req.user.id))return res.status(404).json({error:'Submission not found or not owned by this mentor'});
    await Submission.findByIdAndDelete(req.params.id);
    if(item.attempt)await AssessmentAttempt.findByIdAndDelete(item.attempt);
    res.json({message:'Submission and stored feedback removed'});
  }catch(e){res.status(400).json({error:e.message})}
});
router.get('/public/:token',async(req,res)=>{try{if(!connected()){const assessment=demo.find(x=>x.uniqueToken===req.params.token);return assessment?res.json({assessment,availabilityError:availabilityError(assessment)}):res.status(404).json({error:'Assessment not found'})}const assessment=await Assessment.findOne({uniqueToken:req.params.token});if(!assessment)return res.status(404).json({error:'Assessment not found'});const error=availabilityError(assessment);const metadata=assessment.toObject();metadata.questions=[];metadata.allowedEmails=[];res.json({assessment:error?null:metadata,availabilityError:error})}catch(e){res.status(500).json({error:e.message})}});
router.post('/public/:token/start',demoAuth,async(req,res)=>{try{const {name,email}=req.body;if(!name?.trim()||!email?.trim())return res.status(400).json({error:'Full name and email are required'});const studentEmail=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail))return res.status(400).json({error:'Enter a valid email address'});let assessment;let demoAttempt=null;if(connected())assessment=await Assessment.findOne({uniqueToken:req.params.token});else assessment=demo.find(x=>x.uniqueToken===req.params.token);if(!assessment)return res.status(404).json({error:'Assessment not found'});const allowedEmails=normalizeAllowedEmails(assessment.allowedEmails);if(allowedEmails.length&&!allowedEmails.includes(studentEmail))return res.status(403).json({error:'Your email is not allowed to take this assessment. Please contact your mentor.'});const error=availabilityError(assessment);if(error)return res.status(403).json({error});let studentId=req.user?.id;if(!studentId&&connected()){const studentUser=await User.findOne({email:studentEmail});if(studentUser)studentId=studentUser._id;}if(assessment.oneAttemptPerEmail){if(connected()){const existing=await AssessmentAttempt.findOne({assessmentToken:req.params.token,studentEmail,status:{$in:['In Progress','Submitted','Evaluated']}});if(existing){const remaining=Math.max(0,Math.ceil((assessment.duration*60000-(Date.now()-new Date(existing.startTime).getTime()))/1000));if(existing.status==='Submitted'||existing.status==='Evaluated'){const saved=await Submission.findOne({attempt:existing._id}).populate('assessment','title totalMarks');return res.json({attemptId:existing._id,startTime:existing.startTime,remainingTime:0,status:existing.status,assessment:studentAssessment(assessment),result:saved?.result||{score:existing.score,totalPossible:assessment.totalMarks,needsReview:false}})}return res.json({attemptId:existing._id,startTime:existing.startTime,remainingTime:remaining,status:existing.status,assessment:studentAssessment(assessment)})}}else{const existing=demoAttempts.find(x=>x.assessmentToken===req.params.token&&x.studentEmail===studentEmail&&x.status!=='Closed');if(existing)return res.json({attemptId:existing.id,startTime:existing.startTime,remainingTime:existing.remainingTime,status:existing.status,assessment:studentAssessment(assessment)})}}if(connected()){const attempt=await AssessmentAttempt.create({assessmentToken:req.params.token,assessmentId:assessment._id,studentId:studentId||undefined,studentName:name.trim(),studentEmail,startTime:new Date(),status:'In Progress'});return res.status(201).json({attemptId:attempt._id,startTime:attempt.startTime,remainingTime:assessment.duration*60,status:'In Progress',assessment:studentAssessment(assessment)})}demoAttempt={id:String(Date.now()),assessmentToken:req.params.token,assessmentId:assessment.id||assessment._id,title:assessment.title,subject:assessment.subject,topic:assessment.topic,studentName:name.trim(),studentEmail,startTime:new Date(),remainingTime:(assessment.duration||30)*60,status:'In Progress'};demoAttempts.push(demoAttempt);res.status(201).json({attemptId:demoAttempt.id,startTime:demoAttempt.startTime,remainingTime:demoAttempt.remainingTime,status:'In Progress',assessment:studentAssessment(assessment)})}catch(e){res.status(500).json({error:e.message})}});
router.put('/public/:token/attempt/:attemptId/answers',async(req,res)=>{try{const answers=Array.isArray(req.body.answers)?req.body.answers:[];if(connected()){const attempt=await AssessmentAttempt.findOne({_id:req.params.attemptId,assessmentToken:req.params.token,status:'In Progress'});if(!attempt)return res.status(404).json({error:'Active attempt not found'});const assessment=await Assessment.findOne({uniqueToken:req.params.token});const elapsed=Date.now()-new Date(attempt.startTime).getTime();attempt.remainingTime=Math.max(0,Math.ceil((assessment.duration*60000-elapsed)/1000));await attempt.save();return res.json({remainingTime:attempt.remainingTime})}const attempt=demoAttempts.find(x=>x.id===req.params.attemptId&&x.assessmentToken===req.params.token&&x.status==='In Progress');if(!attempt)return res.status(404).json({error:'Active attempt not found'});return res.json({remainingTime:attempt.remainingTime})}catch(e){res.status(400).json({error:e.message})}});
router.post('/public/:token/attempt/:attemptId/submit',demoAuth,async(req,res)=>{try{
  const answers=Array.isArray(req.body.answers)?req.body.answers:[];
  if(connected()){
    const attempt=await AssessmentAttempt.findOne({_id:req.params.attemptId,assessmentToken:req.params.token,status:'In Progress'});
    if(!attempt)return res.status(404).json({error:'Active attempt not found'});
    attempt.endTime=new Date();attempt.status='Submitted';
    const assessment=await Assessment.findOne({uniqueToken:req.params.token});
    if(!assessment)return res.status(404).json({error:'Assessment not found'});
    let score=0;const strengths=[],improvements=[],questionResults=[];
    assessment.questions.forEach((question,index)=>{
      const answer=answers.find(x=>x.questionIndex===index)?.answer;const marks=Number(question.marks)||0;
      let correct=null;
      if(question.type==='Multiple Choice'){correct=String(answer||'').trim()===(String(question.correctAnswer||'').trim());if(correct)score+=marks;}
      if(question.type==='Multiple Select'){
        correct=Array.isArray(answer)&&Array.isArray(question.correctAnswer)&&JSON.stringify([...answer].sort())===JSON.stringify([...question.correctAnswer].sort());if(correct)score+=marks;
      }
      if(correct===true)strengths.push(`Correctly answered: ${question.text}`);
      if(correct===false)improvements.push(answer?`Review concept: ${question.text}`:`Question missed: ${question.text}`);
      if(correct===null&&!String(answer||'').trim())improvements.push(`Add a complete answer to: ${question.text}`);
      if(correct===null&&String(answer||'').trim())improvements.push(question.type==='Coding / Problem Solving'?`Review code logic and test edge cases for: ${question.text}`:`Improve explanation with clear steps and examples for: ${question.text}`);
      questionResults.push({index,text:question.text,type:question.type,answer:question.type==='Flowchart'?'Flowchart image uploaded':(answer||'Not answered'),correctAnswer:question.correctAnswer,earned:correct===true?marks:correct===false?0:null,maxMarks:marks,correct});
    });
    if(!strengths.length)strengths.push('Keep building confidence through focused practice.');
    const needsReview=assessment.questions.some(q=>q.type==='Short Answer'||q.type==='Long Answer'||q.type==='Coding / Problem Solving');
    const totalPossible=Number(assessment.totalMarks)||0;
    const feedback=await generateStudentFeedback({assessment,questionResults});
    const correctCount=questionResults.filter(item=>item.correct===true).length;
    const wrongCount=questionResults.filter(item=>item.correct===false).length;
    const correctQuestions=questionResults.filter(item=>item.correct===true).map(item=>item.text);
    const wrongQuestions=questionResults.filter(item=>item.correct===false).map(item=>item.text);
    const questionReview=questionResults.filter(item=>item.correct!==null&&item.correct!==undefined).map(item=>{const source=assessment.questions?.[item.index]||{};const correctAnswer=item.correctAnswer;return {index:item.index,text:item.text,type:item.type,correctAnswer,options:Array.isArray(source.options)?source.options:[],correct:item.correct,explanation:item.correct?`You selected the correct answer. This confirms your understanding of ${assessment.topic||assessment.subject||'this concept'}.`:item.correctAnswer!==undefined&&item.correctAnswer!==null&&String(item.correctAnswer)!==''?`Correct answer: ${Array.isArray(item.correctAnswer)?item.correctAnswer.join(', '):item.correctAnswer}. Review the concept and try again before moving ahead.`:'Review this concept and compare it with the assessment explanation.'};});const result={score,totalPossible,passed:!needsReview&&score>=Number(assessment.passingMarks||0),needsReview,status:needsReview?'Submitted — mentor review pending':score>=Number(assessment.passingMarks||0)?'Passed':'Needs practice',summary:feedback.summary,strengths:feedback.strengths,gaps:feedback.gaps,nextSteps:feedback.nextSteps,improvements:feedback.gaps,correctCount,wrongCount,correctQuestions,wrongQuestions,questionReview};
    attempt.score=score;attempt.remainingTime=Math.max(0,Math.ceil((assessment.duration*60000-(attempt.endTime-attempt.startTime))/1000));await attempt.save();
    let studentId=attempt.studentId||req.user?.id;
    if(!studentId&&connected()){
      const studentUser=await User.findOne({email:attempt.studentEmail});
      if(studentUser)studentId=studentUser._id;
    }
    await Submission.findOneAndUpdate(
      {attempt:attempt._id},
      {assessment:assessment._id,student:studentId||undefined,studentName:attempt.studentName,studentEmail:attempt.studentEmail,attempt:attempt._id,result,status:'Submitted'},
      {upsert:true,new:true}
    );
    return res.json({confirmation:'Submission received successfully',score,totalMarks:totalPossible,passingMarks:assessment.passingMarks,result,status:'Submitted'});
  }
  const attempt=demoAttempts.find(x=>x.id===req.params.attemptId&&x.assessmentToken===req.params.token&&x.status==='In Progress');
  if(!attempt)return res.status(404).json({error:'Active attempt not found'});
  attempt.status='Submitted';attempt.endTime=new Date();
  const assessment=demo.find(x=>x.uniqueToken===req.params.token);let score=0;const strengths=[],improvements=[],questionResults=[];
  assessment?.questions?.forEach((q,i)=>{const answer=answers.find(x=>x.questionIndex===i)?.answer;const marks=Number(q.marks)||0;let correct=null;if(q.type==='Multiple Choice'){correct=String(answer||'')===String(q.correctAnswer||'');if(correct)score+=marks;}if(q.type==='Multiple Select'){correct=Array.isArray(answer)&&JSON.stringify([...answer].sort())===JSON.stringify([...(q.correctAnswer||[])].sort());if(correct)score+=marks;}if(correct===true)strengths.push(`Correctly answered: ${q.text}`);else if(correct===false)improvements.push(answer?`Review concept: ${q.text}`:`Question missed: ${q.text}`);else{if(!String(answer||'').trim())improvements.push(`Add a complete answer to: ${q.text}`);else improvements.push(`Improve explanation and reasoning for: ${q.text}`);}questionResults.push({index:i,text:q.text,type:q.type,answer:answer||'Not answered',correctAnswer:q.correctAnswer,earned:correct===true?marks:correct===false?0:null,maxMarks:marks,correct});});
  const totalPossible=Number(assessment?.totalMarks)||0;const needsReview=assessment?.questions?.some(q=>q.type!=='Multiple Choice'&&q.type!=='Multiple Select');const feedback=await generateStudentFeedback({assessment:assessment||{},questionResults});const correctCount=questionResults.filter(item=>item.correct===true).length;const wrongCount=questionResults.filter(item=>item.correct===false).length;const correctQuestions=questionResults.filter(item=>item.correct===true).map(item=>item.text);const wrongQuestions=questionResults.filter(item=>item.correct===false).map(item=>item.text);const questionReview=questionResults.filter(item=>item.correct!==null&&item.correct!==undefined).map(item=>{const source=assessment?.questions?.[item.index]||{};const correctAnswer=item.correctAnswer;return {index:item.index,text:item.text,type:item.type,correctAnswer,options:Array.isArray(source.options)?source.options:[],correct:item.correct,explanation:item.correct?`You selected the correct answer. This confirms your understanding of ${assessment?.topic||assessment?.subject||'this concept'}.`:item.correctAnswer!==undefined&&item.correctAnswer!==null&&String(item.correctAnswer)!==''?`Correct answer: ${Array.isArray(item.correctAnswer)?item.correctAnswer.join(', '):item.correctAnswer}. Review the concept and try again before moving ahead.`:'Review this concept and compare it with the assessment explanation.'};});const result={score,totalPossible,passed:!needsReview&&score>=Number(assessment?.passingMarks||0),needsReview,status:needsReview?'Submitted — mentor review pending':score>=Number(assessment?.passingMarks||0)?'Passed':'Needs practice',summary:feedback.summary,strengths:feedback.strengths,gaps:feedback.gaps,nextSteps:feedback.nextSteps,improvements:feedback.gaps,correctCount,wrongCount,correctQuestions,wrongQuestions,questionReview};
  attempt.score=score;attempt.totalPossible=totalPossible;attempt.passed=result.passed;attempt.result=result;attempt.title=assessment?.title||'Assessment';attempt.subject=assessment?.subject||'';attempt.topic=assessment?.topic||'';attempt.assessmentId=assessment?.id||assessment?._id;
  res.json({confirmation:'Submission received successfully',score,totalMarks:totalPossible,result,status:'Submitted'});
}catch(e){res.status(400).json({error:e.message})}});
router.get('/:id',demoAuth,mentorOnly,async(req,res)=>{try{if(!connected()){const item=demo.find(x=>(x.id===req.params.id||x._id===req.params.id)&&String(x.mentor)===String(req.user.id));return item?res.json(item):res.status(404).json({error:'Assessment not found'})}const item=await Assessment.findOne({_id:req.params.id,mentor:req.user.id});return item?res.json(item):res.status(404).json({error:'Assessment not found'})}catch(e){res.status(404).json({error:'Assessment not found'})}});
router.post('/',demoAuth,mentorOnly,async(req,res)=>{try{const uniqueToken=req.body.status==='published'?(req.body.uniqueToken||crypto.randomBytes(12).toString('hex')):undefined;const payload={...req.body,allowedEmails:normalizeAllowedEmails(req.body.allowedEmails),uniqueToken,isActive:false,status:req.body.status||'draft'};if(!connected()){const item={...payload,id:String(Date.now()),mentor:req.user.id,createdAt:new Date(),updatedAt:new Date()};demo.unshift(item);return res.status(201).json(item)}const item=await Assessment.create({...payload,mentor:req.user.id});res.status(201).json(item)}catch(e){res.status(400).json({error:e.message})}});
router.put('/:id',demoAuth,mentorOnly,async(req,res)=>{try{if(Array.isArray(req.body.allowedEmails)||typeof req.body.allowedEmails==='string')req.body.allowedEmails=normalizeAllowedEmails(req.body.allowedEmails);if(!connected()){const i=demo.findIndex(x=>(x.id===req.params.id||x._id===req.params.id)&&String(x.mentor)===String(req.user.id));if(i<0)return res.status(404).json({error:'Assessment not found'});demo[i]={...demo[i],...req.body,updatedAt:new Date()};return res.json(demo[i])}const item=await Assessment.findOneAndUpdate({_id:req.params.id,mentor:req.user.id},req.body,{new:true,runValidators:true});return item?res.json(item):res.status(404).json({error:'Assessment not found or not owned by this mentor'})}catch(e){res.status(400).json({error:e.message})}});
router.patch('/:id/publish',demoAuth,mentorOnly,async(req,res)=>{try{if(!connected()){const i=demo.findIndex(x=>(x.id===req.params.id||x._id===req.params.id)&&String(x.mentor)===String(req.user.id));if(i<0)return res.status(404).json({error:'Assessment not found'});if(!demo[i].questions?.length)return res.status(400).json({error:'Assessment must contain at least one question'});demo[i]={...demo[i],status:'published',isActive:false,uniqueToken:demo[i].uniqueToken||crypto.randomBytes(12).toString('hex')};return res.json(demo[i])}const assessment=await Assessment.findOne({_id:req.params.id,mentor:req.user.id});if(!assessment)return res.status(404).json({error:'Assessment not found'});if(!assessment.questions?.length)return res.status(400).json({error:'Assessment must contain at least one question'});assessment.status='published';assessment.isActive=false;if(!assessment.uniqueToken)assessment.uniqueToken=crypto.randomBytes(12).toString('hex');await assessment.save();return res.json(assessment)}catch(e){res.status(400).json({error:e.message})}});
router.patch('/:id/link',demoAuth,mentorOnly,async(req,res)=>{try{const active=Boolean(req.body.isActive);if(!connected()){const i=demo.findIndex(x=>(x.id===req.params.id||x._id===req.params.id)&&String(x.mentor)===String(req.user.id));if(i<0)return res.status(404).json({error:'Assessment not found'});demo[i]={...demo[i],isActive:active,status:'published'};return res.json(demo[i])}const assessment=await Assessment.findOne({_id:req.params.id,mentor:req.user.id});if(!assessment)return res.status(404).json({error:'Assessment not found'});if(assessment.status==='draft')return res.status(400).json({error:'Publish the assessment before activating its link'});assessment.isActive=active;await assessment.save();res.json(assessment)}catch(e){res.status(400).json({error:e.message})}});
router.patch('/:id/close',demoAuth,mentorOnly,async(req,res)=>{try{if(!connected()){const i=demo.findIndex(x=>(x.id===req.params.id||x._id===req.params.id)&&String(x.mentor)===String(req.user.id));if(i<0)return res.status(404).json({error:'Assessment not found'});demo[i]={...demo[i],status:'closed',isActive:false};return res.json(demo[i])}const assessment=await Assessment.findOneAndUpdate({_id:req.params.id,mentor:req.user.id},{status:'closed',isActive:false},{new:true});return assessment?res.json(assessment):res.status(404).json({error:'Assessment not found'})}catch(e){res.status(400).json({error:e.message})}});
router.delete('/:id',demoAuth,mentorOnly,async(req,res)=>{try{if(!connected()){const before=demo.length;demo=demo.filter(x=>!(x.id===req.params.id&&String(x.mentor)===String(req.user.id)));return before===demo.length?res.status(404).json({error:'Assessment not found'}):res.json({message:'Assessment deleted'})}const item=await Assessment.findOneAndDelete({_id:req.params.id,mentor:req.user.id});return item?res.json({message:'Assessment deleted'}):res.status(404).json({error:'Assessment not found'})}catch(e){res.status(400).json({error:e.message})}});
export default router;
