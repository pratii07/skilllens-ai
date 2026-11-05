import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { LayoutDashboard, ClipboardCheck, BarChart3, Users, CalendarDays, BookOpen, Settings, HelpCircle, Search, Bell, Plus, ChevronRight, Clock3, FileText, Trash2, Pencil, X, CheckCircle2, ArrowLeft, Send } from 'lucide-react';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:4000/api' : '/api') });
api.interceptors.request.use((config) => { const session = load('skilllens_user', null); if (session?.token) config.headers.Authorization = 'Bearer ' + session.token; return config });
const svgFlowchartDataUri = (svg) => { if (!svg || typeof svg !== 'string') return ''; if (svg.startsWith('data:image')) return svg; const encoded = encodeURIComponent(svg.startsWith('<svg') ? svg : `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420"><rect width="700" height="420" fill="white"/><text x="350" y="210" text-anchor="middle" font-family="Arial" font-size="24">${svg}</text></svg>`); return `data:image/svg+xml;charset=utf-8,${encoded}` };
const normalizeSection = (section, type) => type === 'Flowchart' || type === 'HTML/CSS Upload' || type === 'Coding / Problem Solving' ? 'Task / Practical' : section === 'Practical' || section === 'Task / Practical' ? 'Task / Practical' : 'MCQ';
const emptyQuestion = () => ({ text: '', section: 'MCQ', answerType: 'Multiple Choice', type: 'Multiple Choice', marks: '5', difficulty: 'Beginner', options: ['', '', '', ''], correctAnswer: '', imageData: '', imageName: '' });
const emptyAssessment = () => ({ id: '', title: '', subject: 'Problem Solving', phase: 'Phase 1', topic: '', difficulty: 'Beginner', description: '', instructions: '', duration: '30', totalMarks: '100', passingMarks: '40', questions: [emptyQuestion()], status: 'draft', isActive: false, uniqueToken: '', startDate: '', endDate: '', maxAttempts: '1', oneAttemptPerEmail: true, allowedEmails: [], createdAt: new Date().toISOString() });
const demoAssessment = { ...emptyAssessment(), id: 'demo-flowcharts', uniqueToken: 'demo-flowcharts', title: 'Problem Solving — Phase 1', subject: 'Problem Solving', topic: 'Flowcharts', duration: '30', totalMarks: '25', passingMarks: '10', status: 'published', isActive: false, questions: [{ text: 'What symbol represents a decision in a flowchart?', type: 'Multiple Choice', marks: '5', difficulty: 'Beginner', options: ['Rectangle', 'Diamond', 'Oval', 'Parallelogram'], correctAnswer: 'Diamond' }, { text: 'Explain the sequence of steps for adding two numbers.', type: 'Short Answer', marks: '10', difficulty: 'Beginner', options: [], correctAnswer: '' }, { text: 'Write a flowchart to determine whether a number is even or odd.', type: 'Coding / Problem Solving', marks: '10', difficulty: 'Intermediate', options: [], correctAnswer: '' }] };
function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback } }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function practiceDayKey(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date) }
function nextPracticeCheckIn(current={}) {
  const today=practiceDayKey();
  if(current.lastPracticeDate===today)return {...current,alreadyCheckedIn:true};
  const yesterday=practiceDayKey(new Date(Date.now()-86400000));
  const practiceStreak=current.lastPracticeDate===yesterday?(Number(current.practiceStreak)||0)+1:1;
  const certificates=Array.isArray(current.certificates)?[...current.certificates]:[];
  if((practiceStreak===7||practiceStreak===30)&&!certificates.some(item=>item.name===`${practiceStreak}-Day Learning Streak`))certificates.push({name:`${practiceStreak}-Day Learning Streak`,earnedAt:new Date().toISOString(),reason:`Completed ${practiceStreak} consecutive days of practice`});
  return {xp:(Number(current.xp)||0)+10,practiceStreak,longestStreak:Math.max(Number(current.longestStreak)||0,practiceStreak),lastPracticeDate:today,certificates,alreadyCheckedIn:false};
}
function cryptoToken() { if (window.crypto?.getRandomValues) { const bytes = new Uint8Array(12); window.crypto.getRandomValues(bytes); return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') } return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function assessmentToken(a) { return a?.uniqueToken || `assessment-${a?.id || a?._id || cryptoToken()}` }
function normalizedAssessments(items) { return (Array.isArray(items) ? items : [demoAssessment]).map(a => a ? ({ ...a, uniqueToken: assessmentToken(a) }) : a) }

function createPracticeQuestions(topic) {
  const clean=String(topic||'Flowchart').trim()||'Flowchart';const key=clean.toLowerCase();
  const flowchart=[
    ['Which shape represents a decision?', ['Rectangle','Diamond','Oval','Parallelogram'],1],
    ['Which shape commonly marks the start or end?', ['Oval','Diamond','Rectangle','Arrow'],0],
    ['Which shape represents input or output?', ['Parallelogram','Rectangle','Oval','Diamond'],0],
    ['What does an arrow show?', ['The flow direction','A calculation','A title','A data type'],0],
    ['Which shape represents a process or calculation?', ['Rectangle','Diamond','Oval','Parallelogram'],0],
    ['A decision symbol usually has which branches?', ['Yes and No','Start and Stop','Input and Print','Add and Subtract'],0],
    ['What should a flowchart show before a decision?', ['The condition being checked','The final answer only','A random step','A second start'],0],
    ['What is the purpose of tracing a flowchart?', ['Follow each step to find the result','Redraw every symbol','Remove all decisions','Skip the inputs'],0],
    ['How is a repeated set of steps usually shown?', ['A loop back arrow','A second end symbol','A larger rectangle','A text label only'],0],
    ['What makes a flowchart easier to follow?', ['Clear arrows and a logical order','Crossed arrows everywhere','Missing start and end','Unlabeled decisions'],0]
  ];
  const algorithms=[
    ['What is an algorithm?', ['A finite sequence of steps for solving a problem','A computer screen','A flowchart symbol','A programming error'],0],
    ['Why is pseudocode useful?', ['It describes logic without strict programming syntax','It runs without a computer','It replaces testing','It stores pictures'],0],
    ['What does a loop do?', ['Repeats a set of steps','Ends every program','Renames a variable','Displays a diagram'],0],
    ['What does an IF statement support?', ['Making a decision from a condition','Repeating forever','Receiving a file','Naming a function'],0],
    ['What should an algorithm do with its input?', ['Process it to produce an output','Ignore it','Turn it into a comment','Delete every step'],0],
    ['Why test an algorithm with sample values?', ['To check that its steps produce expected results','To make it longer','To remove the output','To avoid edge cases'],0],
    ['What is an edge case?', ['An unusual boundary input that should still be handled','The first line of pseudocode','A kind of arrow','A final comment'],0],
    ['What is decomposition in problem solving?', ['Breaking a large problem into smaller parts','Combining unrelated answers','Skipping the requirements','Repeating one step forever'],0],
    ['A well-formed algorithm should eventually…', ['Finish after a finite number of steps','Run forever','Remove all inputs','Change its goal'],0],
    ['How can you check an algorithm is correct?', ['Compare its output with the required result','Count its comments only','Rename its variables','Remove its tests'],0]
  ];
  const programming=[
    ['What is a variable used for?', ['To store a value that a program can use','To draw a flowchart','To stop the computer','To format a comment'],0],
    ['What does a Boolean value represent?', ['True or false','A whole list','A picture','A function name'],0],
    ['What does a conditional statement do?', ['Chooses a path based on a condition','Repeats every line forever','Stores a file','Changes the language'],0],
    ['What is a loop useful for?', ['Repeating instructions','Naming a value','Showing a comment','Ending the keyboard'],0],
    ['What is a function?', ['A reusable block of code for a task','A single character','A hardware part','A type of error message'],0],
    ['What does debugging mean?', ['Finding and fixing errors in a program','Adding unrelated features','Deleting every test','Changing the topic'],0],
    ['Why does syntax matter?', ['The language expects code to follow its writing rules','It makes code run without logic','It replaces variables','It stores output'],0],
    ['What is a useful program test?', ['Check actual output against expected output','Change code without checking','Test only an empty file','Skip all inputs'],0],
    ['What is an array commonly used for?', ['Keeping an ordered collection of values','Repeating a comment','Stopping a function','Drawing a diamond'],0],
    ['What makes a code comment helpful?', ['It explains intent that may not be obvious','It changes the program output','It hides every error','It replaces all variable names'],0]
  ];
  const databases=[
    ['Which SQL clause selects rows that match a condition?', ['WHERE','ORDER BY','CREATE','GRANT'],0],
    ['What does a primary key do?', ['Uniquely identifies each row','Sorts every table automatically','Encrypts a database','Joins every table'],0],
    ['Which SQL command reads records from a table?', ['SELECT','UPDATE','DROP','ALTER'],0],
    ['What is a foreign key used for?', ['Linking a row to a key in another table','Encrypting a column','Sorting query output','Renaming a database'],0],
    ['What does an INNER JOIN return?', ['Rows with matching join values in both tables','Every possible row combination','Only rows from the left table','Only duplicate columns'],0],
    ['What is a database index mainly used for?', ['Speeding up data lookup','Replacing all constraints','Storing passwords as plain text','Removing duplicate tables'],0],
    ['Which SQL command changes existing rows?', ['UPDATE','SELECT','CREATE','DESCRIBE'],0],
    ['What does a database transaction help keep reliable?', ['A group of related changes','A web page layout','A source code comment','A network address'],0],
    ['Why use a parameterized query?', ['To safely pass values and reduce SQL injection risk','To remove all query conditions','To make every table public','To sort data by default'],0],
    ['What does GROUP BY do in SQL?', ['Groups rows for aggregate calculations','Filters rows before reading','Deletes repeated records','Renames a column'],0]
  ];
  const webTech=[
    ['What is HTML primarily used to define?', ['The structure and meaning of web content','The database server','Network routing','Image compression only'],0],
    ['What is CSS used for?', ['Styling and layout of web pages','Querying a database','Encrypting HTTP traffic','Defining server ports'],0],
    ['Which HTML element is intended for the main page content?', ['<main>','<font>','<center>','<blink>'],0],
    ['What does the CSS box model describe?', ['Content, padding, border, and margin','DNS, IP, TCP, and HTTP','Rows, keys, indexes, and joins','Functions, classes, loops, and arrays'],0],
    ['What does a CSS class selector target?', ['Elements with a matching class attribute','Only the page title','An element by its URL','Every database row'],0],
    ['What is the DOM?', ['A tree representation of a web document','A database query language','A compression format','A network protocol'],0],
    ['Which attribute provides alternative text for an image?', ['alt','href','target','rel'],0],
    ['What does responsive web design aim to do?', ['Adapt a layout to different screen sizes','Prevent all user input','Replace HTML with SQL','Force a fixed page width'],0],
    ['Which HTTP method is commonly used to retrieve a resource?', ['GET','PATCH','DELETE','TRACE'],0],
    ['Why use semantic HTML elements?', ['To communicate the role of content to browsers and assistive tools','To execute SQL queries','To encrypt stylesheets','To set network routes'],0]
  ];
  const networking=[
    ['What does DNS do?', ['Maps domain names to IP addresses','Encrypts database rows','Styles a web page','Compiles source code'],0],
    ['What does an IP address identify?', ['A network interface or endpoint for routing','A SQL table','A CSS rule','A source code function'],0],
    ['What is TCP known for?', ['Reliable, ordered delivery of a byte stream','Styling web page layouts','Storing relational data','Resolving variable names'],0],
    ['What does HTTPS add to HTTP?', ['TLS protection for data in transit','Automatic database backups','Faster JavaScript parsing','A larger IP address'],0],
    ['Which protocol is commonly used to load web pages?', ['HTTP','FTP only','SMTP only','DHCP only'],0],
    ['What does a router do?', ['Forwards packets between networks','Stores browser styles','Executes SQL joins','Compiles HTML'],0],
    ['What is latency?', ['The time taken for data to travel and receive a response','The size of a database table','The number of CSS selectors','The age of a certificate'],0],
    ['What is a port number used for?', ['Identifying a service or process at a network endpoint','Naming a DNS record only','Encrypting a packet','Replacing an IP address'],0],
    ['What does a firewall typically do?', ['Allows or blocks traffic according to rules','Translates HTML into CSS','Sorts database rows','Compresses images'],0],
    ['Why is TLS certificate validation important?', ['It helps verify the server identity and secure connection','It assigns a private IP','It improves CSS rendering','It guarantees an application has no bugs'],0]
  ];
  const dataStructures=[
    ['Which structure follows last in, first out?', ['Stack','Queue','Set','Graph'],0],
    ['Which structure follows first in, first out?', ['Queue','Stack','Tree','Heap'],0],
    ['What is the average lookup time for a well-distributed hash table?', ['O(1)','O(n²)','O(log n) always','O(2ⁿ)'],0],
    ['What is a node in a linked list commonly connected to?', ['One or more neighboring nodes','A CSS selector','A SQL transaction','A network port'],0],
    ['What property defines a binary tree?', ['Each node has at most two children','Every node has exactly four children','All values are stored in a queue','The tree has no root'],0],
    ['What is a common use of a priority queue?', ['Removing the highest- or lowest-priority item first','Preserving insertion order only','Storing unique keys without values','Searching a string by prefix only'],0],
    ['What does a set usually guarantee?', ['Unique elements','Sorted elements in every language','Key-value pairs only','A fixed number of elements'],0],
    ['Which traversal visits a node before its children?', ['Preorder','Postorder','Level order only','Reverse sort'],0],
    ['What is a graph edge?', ['A connection between vertices','A queue operation','A hash function output','A tree root value'],0],
    ['When is binary search applicable?', ['When the search range is ordered','When values are random and unsorted','Only on linked lists without ordering','Only when there is one item'],0]
  ];
  const numberPatterns=[
    ['What comes next: 2, 4, 6, 8, …?', ['9','10','12','16'],1],
    ['What comes next: 1, 3, 5, 7, …?', ['8','9','10','11'],1],
    ['What comes next: 3, 6, 12, 24, …?', ['30','36','48','42'],2],
    ['What comes next: 1, 4, 9, 16, …?', ['20','24','25','36'],2],
    ['What comes next: 20, 15, 10, …?', ['0','4','5','6'],2],
    ['What comes next: 4, 8, 12, …?', ['14','15','16','20'],2],
    ['What comes next: 5, 10, 20, 40, …?', ['45','60','80','100'],2],
    ['What comes next: 2, 5, 8, …?', ['10','11','12','13'],1],
    ['Which number is even?', ['13','17','22','25'],2],
    ['A number is divisible by 2 when its remainder is…?', ['0','1','2','The number'],0]
  ];
  const topicTechnical=[
    [`How would you verify an implementation of ${clean}?`,['Run a test with a known expected result','Rename the project','Remove its inputs','Skip execution'],0],
    [`Which input is important when testing ${clean}?`,['A boundary or empty input','Only the easiest typical input','An unrelated file','No input at all'],0],
    [`A ${clean} operation returns an unexpected result. What is a useful first debugging step?`,['Reproduce it with a small case and inspect each step','Rewrite everything without a test','Ignore the output','Change several things at once'],0],
    [`Why validate input used by ${clean}?`,['To detect invalid or unexpected values before processing','To make every input valid automatically','To hide runtime errors','To avoid defining expected behavior'],0],
    [`What helps prevent a bug in ${clean} from returning later?`,['Add a regression test for the failure','Delete the failing example','Disable the test suite','Change the feature name'],0],
    [`How should two implementations of ${clean} be compared?`,['Check correctness and relevant performance on the same cases','Compare their filenames','Use different inputs for each','Assume the shorter one is correct'],0],
    [`What should a ${clean} implementation do with an unsupported case?`,['Handle it clearly or return a defined error','Return an unrelated value','Silently corrupt the result','Loop without stopping'],0],
    [`Which tool is useful for tracing a ${clean} failure?`,['A debugger or structured logs','A wallpaper editor','A font picker','A random number generator'],0],
    [`What should a test for ${clean} compare?`,['Actual behavior against specified expected behavior','The code color against the page color','Only the number of comments','Two unrelated outputs'],0],
    [`When optimizing ${clean}, what must remain true?`,['The required behavior and correctness','The original variable names','The exact number of lines','The order of comments'],0]
  ];
  const topicExtensions=[
    [`When checking a claim about ${clean}, what is most useful?`,['Relevant evidence or a test','A random guess','An unrelated example','Ignoring the result'],0],
    [`How should you compare two examples of ${clean}?`,['Look for the rule they share and where they differ','Choose the longer example','Ignore their conditions','Assume they have the same result'],0],
    [`If steps in a ${clean} solution depend on each other, what should you check?`,['Their order and dependencies','Their font size','Only the final label','An unrelated step'],0],
    [`Which example best tests the limits of a ${clean} rule?`,['A boundary case','A repeated easy case only','An unrelated example','No example'],0],
    [`Before solving a new ${clean} problem, what should you identify?`,['The given data, constraints, and expected output','The answer before reading','An unrelated shortcut','Only the title'],0],
    [`When can you reuse a pattern from ${clean}?`,['When the new problem has matching conditions','Whenever two titles look alike','Without checking inputs','When the result is convenient'],0],
    [`How do you compare an alternative ${clean} solution?`,['Run the same test cases and compare outputs','Check only its length','Ignore its output','Assume it is correct'],0],
    [`After finding a mistake in ${clean}, what is the best next step?`,['Find the first incorrect step and test the correction','Erase the whole goal','Repeat the same guess','Skip the explanation'],0]
  ];
  const specific=/flowchart|flow chart|diagram/i.test(key)?flowchart:/algorithm|pseudocode/i.test(key)?algorithms:/sql|database|dbms/i.test(key)?databases:/html|css|web|dom/i.test(key)?webTech:/network|tcp|ip address|http|dns/i.test(key)?networking:/data structure|array|stack|queue|tree|graph|hash/i.test(key)?dataStructures:/program|coding|javascript|python|java|react/i.test(key)?programming:/number|math|arithmetic|pattern|logic/i.test(key)?numberPatterns:null;
  const bank=specific?[...specific,...topicTechnical,...topicExtensions]:[...topicTechnical,...topicExtensions];
  return bank.map(([q,options,answer])=>{const choices=options.slice();const correctAnswer=choices[answer];choices.sort(()=>Math.random()-.5);return {q,options:choices,answer:correctAnswer}}).sort(()=>Math.random()-.5);
}

function practiceQuestionKey(topic,question){return `${String(topic||'').trim().toLowerCase().replace(/\s+/g,' ')}::${String(question||'').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')}`}

function AssessmentProgressChart({ scores }) {
  const values=scores.map(item=>Math.max(0,Math.min(100,Math.round((Number(item.score)||0)/Math.max(Number(item.totalPossible)||1,1)*100))));
  const average=values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):0;const circumference=2*Math.PI*72;const progressLength=circumference*average/100;
  return <div className="assessment-pie-layout"><div className="assessment-pie-block"><div className="assessment-pie-wrap"><svg viewBox="0 0 180 180" role="img" aria-label={`Average score ${average} percent across the last ${scores.length} assessments`}><circle className="assessment-pie-track" cx="90" cy="90" r="72"/><circle className="assessment-pie-value" cx="90" cy="90" r="72" strokeDasharray={`${progressLength} ${circumference-progressLength}`}/></svg><div className="assessment-pie-center"><strong>{average}%</strong><span>average score</span></div></div><div className="assessment-pie-legend"><span><i/>Average score</span><span><i/>Remaining</span></div></div><div className="assessment-recent-scores"><div className="assessment-recent-heading"><b>Recent assessments</b><span>Score</span></div>{scores.map((item,index)=>{const percent=values[index];const score=Number(item.score)||0;const total=Number(item.totalPossible)||0;return <div className="assessment-recent-row" key={item.id||index}><div className="assessment-recent-info"><b title={item.title||`Assessment ${index+1}`}>{item.title||`Assessment ${index+1}`}</b><small>{item.submittedAt?new Date(item.submittedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):`Test ${index+1}`}</small></div><div className="assessment-recent-bar"><i style={{width:`${percent}%`}}/></div><strong>{score}/{total}</strong></div>})}</div></div>
}

export default function App() {
  const [user, setUser] = useState(() => { const session = load('skilllens_user', null); return session?.user || session }); const role = user?.role === 'mentor' || user?.role === 'admin' ? 'mentor' : user?.role === 'student' ? 'student' : 'guest'; const [active, setActive] = useState('Dashboard');
  const [assessments, setAssessments] = useState([]);
  const [editing, setEditing] = useState(null); const [attempting, setAttempting] = useState(null); const [notice, setNotice] = useState(''); const [submissions, setSubmissions] = useState([]);
  const [filters, setFilters] = useState({ subject: 'All', phase: 'All', difficulty: 'All' });
  const publicMatch = window.location.pathname.match(/^\/assessment\/([^/]+)$/);
  if (publicMatch) return <PublicAssessment token={publicMatch[1]} />;
  useEffect(() => { if (role === 'mentor') api.get('/assessments/mentor/mine').then(({ data }) => { if (Array.isArray(data)) setAssessments(data.map(a => ({ ...a, id: a.id || a._id }))) }).catch(() => { }); }, [role]);
  const updateAssessments = (value) => {
    setAssessments(value);
    const items = Array.isArray(value) ? value : [value];
    items.forEach((item) => {
      if (String(item.id || item._id || '').startsWith('demo-')) return;
      const payload = { title: item.title, subject: item.subject, phase: item.phase, topic: item.topic, difficulty: item.difficulty, description: item.description, instructions: item.instructions, duration: Number(item.duration) || 30, totalMarks: Number(item.totalMarks) || 0, passingMarks: Number(item.passingMarks) || 0, questions: item.questions, status: item.status, isActive: Boolean(item.isActive), uniqueToken: item.uniqueToken, startDate: item.startDate || undefined, endDate: item.endDate || undefined, maxAttempts: item.maxAttempts ? Number(item.maxAttempts) : undefined, oneAttemptPerEmail: item.oneAttemptPerEmail !== false, allowedEmails: Array.isArray(item.allowedEmails) ? item.allowedEmails : [] };
      const databaseId = item._id || item.id || null;
      if (!databaseId) return;
      const exists = assessments.some((existing) => String(existing._id || existing.id || '') === String(databaseId));
      if (exists) api.put(`/assessments/${databaseId}`, payload).catch(() => { });
      else api.post('/assessments', payload).catch(() => { });
    });
  };
  const notify = (text) => { setNotice(text); setTimeout(() => setNotice(''), 3000) };
  const mine = role === 'mentor' ? assessments : [];
  const published = assessments.filter(a => a.status === 'published');
  const publishedFiltered = published.filter(a => (filters.subject === 'All' || a.subject === filters.subject) && (filters.phase === 'All' || a.phase === filters.phase) && (filters.difficulty === 'All' || a.difficulty === filters.difficulty));
  if (!user || role === 'guest') return <Login onLogin={(session) => { save('skilllens_user', session); setUser(session.user || session) }} />;
  if(role==='student')return <StudentDashboard user={user} onLogout={()=>{localStorage.removeItem('skilllens_user');setUser(null)}}/>
  return <div className="sl-app"><aside className="sl-sidebar"><div className="sl-brand"><div className="logo"><span /><span /></div><b>SkillLens</b><em>AI</em></div><nav>{['Dashboard', 'Create Assessment', 'My Assessments', 'Student Submissions', 'AI Insights'].map((item, i) => { const Icon = [LayoutDashboard, Plus, ClipboardCheck, Users, BarChart3][i]; return <button key={item} className={active === item ? 'nav active' : 'nav'} onClick={() => { if (item === 'Create Assessment') { setEditing(emptyAssessment()); setActive(item); return } setActive(item) }}><Icon size={18} /><span>{item}</span></button> })}</nav><div className="side-bottom"><button className="nav"><Settings size={18} /><span>Settings</span></button><button className="nav"><HelpCircle size={18} /><span>Help & support</span></button><div className="profile"><div className="avatar">{user.name?.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div><div><b>{user.name}</b><small>Mentor</small></div><ChevronRight size={16} /></div></div></aside>
    <main className="sl-main"><header className="sl-header"><div><p>MONDAY, OCTOBER 31</p><h1>{active}</h1></div><div className="header-actions"><button className="icon-btn"><Search size={18} /></button><button className="icon-btn notification"><Bell size={18} /><i /></button><div className="role-badge">Mentor access</div><button className="logout-btn" onClick={() => { localStorage.removeItem('skilllens_user'); setUser(null) }}>Log out</button><div className="avatar">{user.name?.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div></div></header>
      <MentorView active={active} assessments={mine} mentorName={user.name} setEditing={setEditing} updateAssessments={updateAssessments} notify={notify} /></main>
    {editing && <AssessmentModal assessment={editing} onClose={() => setEditing(null)} onSave={(item) => { const prepared = { ...item, id: item.id || item._id || '', uniqueToken: item.uniqueToken || (item.status === 'published' ? cryptoToken() : ''), isActive: item.isActive || false }; const databaseId = item.id || item._id; const exists = Boolean(databaseId) && assessments.some(a => String(a.id || a._id) === String(databaseId)); updateAssessments(exists ? assessments.map(a => String(a.id || a._id) === String(databaseId) ? prepared : a) : [prepared, ...assessments]); setEditing(null); notify(prepared.status === 'published' ? (exists ? 'Assessment updated successfully' : 'Assessment published successfully') : (exists ? 'Assessment changes saved' : 'Assessment saved as draft')) }} />}
    {notice && <div className="toast"><CheckCircle2 size={18} />{notice}</div>}
  </div>
}

async function compressAssessmentImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please select an image file');
  const source = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) });
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source });
  const maxWidth = 1400; const scale = Math.min(1, maxWidth / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function FlowchartCanvas({ value, onChange, readOnly = false }) {
  const initial = value && typeof value === 'object' ? value : { nodes: [], connectors: [] };
  const [diagram, setDiagram] = useState(initial.nodes?.length || initial.connectors?.length ? initial : { nodes: [], connectors: [] });
  const [connecting, setConnecting] = useState(null); const [selected, setSelected] = useState(null);
  useEffect(() => { if (value && typeof value === 'object' && (value.nodes || value.connectors)) setDiagram(value) }, [value]);
  const emit = (next) => { setDiagram(next); onChange(next) };
  const nodeSize = { Start: 112, Process: 130, Decision: 120, Input: 130 };
  const addNode = shape => { const nodes = [...diagram.nodes, { id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, shape, x: 260 + ((diagram.nodes.length * 22) % 180), y: 45 + ((diagram.nodes.length * 35) % 280), text: shape === 'Decision' ? 'Yes / No' : shape === 'Start' ? 'Start' : shape === 'Process' ? 'Process' : shape === 'Input' ? 'Input / Output' : 'End' }]; emit({ ...diagram, nodes }) };
  const updateNode = (id, key, value) => emit({ ...diagram, nodes: diagram.nodes.map(n => n.id === id ? { ...n, [key]: value } : n) });
  const removeSelected = () => { if (!selected) return emit({ nodes: diagram.nodes.filter(n => n.id !== selected), connectors: diagram.connectors.filter(c => c.from !== selected && c.to !== selected) }); setSelected(null); setConnecting(null) };
  const clickNode = id => { setSelected(id); if (!connecting) return; if (connecting === '__pick__') { setConnecting(id); return } if (connecting !== id && !diagram.connectors.some(c => c.from === connecting && c.to === id)) { emit({ ...diagram, connectors: [...diagram.connectors, { from: connecting, to: id }] }) } setConnecting(null) };
  const nodeCenter = n => ({ x: n.x + (nodeSize[n.shape] || 112) / 2, y: n.y + (n.shape === 'Decision' ? 55 : 35) });
  return <div className="flowchart-builder">{!readOnly && <div className="flowchart-toolbar"><div><span>Shapes</span>{['Start', 'Process', 'Decision', 'Input', 'End'].map(shape => <button type="button" key={shape} onClick={() => addNode(shape)}>{shape}</button>)}</div><div><button type="button" className="secondary" onClick={() => { setConnecting(connecting ? '' : '__pick__') }}>{connecting ? 'Cancel connection' : 'Connect shapes'}</button><button type="button" className="secondary danger-text" onClick={removeSelected} disabled={!selected}>Delete selected</button><button type="button" className="secondary" onClick={() => emit({ nodes: [], connectors: [] })}>Clear</button></div></div>}{connecting && <div className="flowchart-help"><b>Connect shapes</b><p>Click the first shape, then click the shape it connects to.</p></div>}<div className="flowchart-board"><svg className="flowchart-connectors" viewBox="0 0 700 420">{diagram.connectors.map((c, i) => { const from = diagram.nodes.find(n => n.id === c.from); const to = diagram.nodes.find(n => n.id === c.to); if (!from || !to) return null; const a = nodeCenter(from), b = nodeCenter(to); return <g key={i}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} markerEnd="url(#arrowhead)" /><defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#68758a" /></marker></defs></g> })}</svg>{diagram.nodes.map(n => { const width = nodeSize[n.shape] || 112; return <div key={n.id} className={`flow-node flow-${n.shape.toLowerCase()} ${selected === n.id ? 'selected' : ''}`} style={{ left: n.x, top: n.y, width, height: n.shape === 'Decision' ? 110 : 70 }} onPointerDown={readOnly ? undefined : e => { setSelected(n.id); const board = e.currentTarget.parentElement.getBoundingClientRect(); const startX = e.clientX, startY = e.clientY, originalX = n.x, originalY = n.y; e.currentTarget.setPointerCapture(e.pointerId); const move = ev => updateNode(n.id, 'x', Math.max(0, Math.min(620, originalX + (ev.clientX - startX) * (700 / board.width)))); const moveY = ev => updateNode(n.id, 'y', Math.max(0, Math.min(350, originalY + (ev.clientY - startY) * (420 / board.height)))); e.currentTarget.onPointerMove = ev => { move(ev); moveY(ev) }; e.currentTarget.onPointerUp = () => { e.currentTarget.onPointerMove = null; e.currentTarget.onPointerUp = null } }} onClick={readOnly ? undefined : e => { if (e.detail === 1) clickNode(n.id) }}><input readOnly={readOnly} aria-label={`${n.shape} text`} value={n.text} onPointerDown={ev => ev.stopPropagation()} onChange={ev => updateNode(n.id, 'text', ev.target.value)} /></div> })}</div></div>
}
function StudentDashboard({user,onLogout}){
  const practiceCheckInKey=`skilllens_practice_checkin_${String(user?.email||'').trim().toLowerCase()}`;
  const practiceScoreKey=`skilllens_practice_game_${String(user?.email||'').trim().toLowerCase()}`;
  const practiceUsedKey=`skilllens_practice_used_${String(user?.email||'').trim().toLowerCase()}`;
  const practiceCorrectKey=`skilllens_practice_correct_${String(user?.email||'').trim().toLowerCase()}`;
  const [submissions,setSubmissions]=useState([]);
  const [availableAssessments,setAvailableAssessments]=useState([]);
  const [loading,setLoading]=useState(true);
  const [gameQuestion,setGameQuestion]=useState(0);
  const [gameAnswer,setGameAnswer]=useState('');
  const [profile,setProfile]=useState(()=>({...user,...load(practiceCheckInKey,{}),practiceGameScore:load(`skilllens_practice_game_${String(user?.email||'').trim().toLowerCase()}`,user.practiceGameScore||0)}));
  const [usedPracticeQuestions,setUsedPracticeQuestions]=useState(()=>load(practiceUsedKey,[]));
  const [studentView,setStudentView]=useState('dashboard');
  const [selectedResult,setSelectedResult]=useState(null);
  const [confetti,setConfetti]=useState(false);
  const [checkInMessage,setCheckInMessage]=useState('');
  const [checkInLoading,setCheckInLoading]=useState(false);
  const [practiceTopic,setPracticeTopic]=useState('Flowchart');
  const [practiceTopicDraft,setPracticeTopicDraft]=useState('Flowchart');
  const [correctAnswerCount,setCorrectAnswerCount]=useState(()=>load(practiceCorrectKey,0));
  const [practiceQuestions,setPracticeQuestions]=useState(()=>createPracticeQuestions('Flowchart').filter(question=>!load(practiceUsedKey,[]).includes(practiceQuestionKey('Flowchart',question.q))));
  const updatePracticeTopic=(topic)=>{const clean=String(topic||'').trim();if(!clean)return;const fresh=createPracticeQuestions(clean).filter(question=>!usedPracticeQuestions.includes(practiceQuestionKey(clean,question.q)));setPracticeTopic(clean);setPracticeTopicDraft(clean);setGameQuestion(0);setGameAnswer('');setPracticeQuestions(fresh)};
  
  useEffect(()=>{
    const userEmail = (user?.email || '').trim().toLowerCase();
    // The old unscoped cache mixed submissions from multiple students on shared browsers.
    localStorage.removeItem('skilllens_student_submissions');
    const localCache = (userEmail ? load(`skilllens_student_submissions_${userEmail}`, []) : []) || [];
    if (Array.isArray(localCache) && localCache.length > 0) {
      setSubmissions(localCache);
      setLoading(false);
    }
    api.get('/assessments/student/submissions')
      .then(({data})=>{
        const serverItems = Array.isArray(data) ? data : [];
        const merged = [...serverItems];
        if (Array.isArray(localCache)) {
          localCache.forEach(localItem => {
            const alreadyExists = merged.some(m => String(m.id || '') === String(localItem.id || '') || (m.title === localItem.title && Math.abs(new Date(m.submittedAt || 0) - new Date(localItem.submittedAt || 0)) < 120000));
            if (!alreadyExists) merged.push(localItem);
          });
        }
        merged.sort((a,b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        setSubmissions(merged);
        if (userEmail) save(`skilllens_student_submissions_${userEmail}`, merged);
      })
      .catch(()=>{
        if (!Array.isArray(localCache) || localCache.length === 0) setSubmissions([]);
      })
      .finally(()=>setLoading(false));

    api.get('/assessments?status=published&active=true')
      .then(({data})=>{
        if (Array.isArray(data)) setAvailableAssessments(data);
      })
      .catch(()=>{});

    api.get('/auth/me').then(({data})=>{if(data.user)setProfile(v=>({...v,...data.user,...load(practiceCheckInKey,{}),practiceGameScore:load(practiceScoreKey,data.user.practiceGameScore||0)}))}).catch(()=>{});
  },[user?.email,practiceScoreKey]);

  const checkIn=async()=>{
    if(checkInLoading)return;
    const local=load(practiceCheckInKey,{});
    const current={...profile,...local};
    if(current.lastPracticeDate===practiceDayKey()){setCheckInMessage('You already checked in today. Come back tomorrow!');return;}
    setCheckInLoading(true);
    const offlineFallback=()=>{if(import.meta.env.PROD)throw new Error('Practice check-in is temporarily unavailable because the server database is offline. Try again shortly.');return {...current,...nextPracticeCheckIn(current)}};
    try{
      let result;
      try{
        const {data:health}=await api.get('/health');
        if(health.mongo==='connected'){
          const {data}=await api.post('/auth/practice/check-in');
          result={...current,...data};
        }else result=offlineFallback();
      }catch{result=offlineFallback()}
      save(practiceCheckInKey,{xp:result.xp,practiceStreak:result.practiceStreak,longestStreak:result.longestStreak,lastPracticeDate:result.lastPracticeDate,certificates:result.certificates||[]});
      setProfile(v=>({...v,...result}));
      setCheckInMessage(result.alreadyCheckedIn?'You already checked in today. Come back tomorrow!':'Check-in successful! +10 XP added.');
    }catch(err){setCheckInMessage(err.response?.data?.error||err.message||'Unable to update practice streak')}
    finally{setCheckInLoading(false)}
  };
  const saveProfile=async(event)=>{event.preventDefault();try{const {data}=await api.put('/auth/me',profile);setProfile(v=>({...v,...data.user}));const session=load('skilllens_user',{})||{};save('skilllens_user',{...session,user:data.user,token:data.token||session.token});setCheckInMessage('Profile updated successfully.')}catch(err){const message=err.response?.data?.error||'';if(message.includes('Cast to ObjectId failed')&&import.meta.env.DEV){const localProfile={...profile};setProfile(localProfile);const session=load('skilllens_user',{})||{};save('skilllens_user',{...session,user:localProfile});setCheckInMessage('Profile saved in this browser. Restart the backend to sync it to the server.')}else setCheckInMessage(message||'Unable to update profile')}};

  const answerGame=async(answer)=>{
    const currentQuestion=practiceQuestions[gameQuestion];
    if(gameAnswer||!currentQuestion)return;
    setGameAnswer(answer);
    const correct=answer===currentQuestion.answer;
    const delta=correct?10:-10;
    const previous=profile.practiceGameScore||0;
    const optimistic=Math.max(0,previous+delta);
    const questionKey=practiceQuestionKey(practiceTopic,currentQuestion.q);
    if(!usedPracticeQuestions.includes(questionKey)){const nextUsedQuestions=[...usedPracticeQuestions,questionKey];setUsedPracticeQuestions(nextUsedQuestions);save(practiceUsedKey,nextUsedQuestions)}
    const nextCorrectCount=correct?correctAnswerCount+1:correctAnswerCount;
    const reachedMilestone=correct&&nextCorrectCount>=10;
    const savedCorrectCount=reachedMilestone?0:nextCorrectCount;
    setCorrectAnswerCount(savedCorrectCount);
    save(practiceCorrectKey,savedCorrectCount);
    const nextScore=reachedMilestone?0:optimistic;
    setProfile(v=>({...v,practiceGameScore:nextScore}));
    save(practiceScoreKey,nextScore);
    if(reachedMilestone){setConfetti(true);setTimeout(()=>setConfetti(false),4000)}
    try{
      const {data}=await api.post('/auth/practice/game-score',{delta,reset:reachedMilestone});
      const syncedScore=(reachedMilestone||data.practiceMilestoneReached)?0:Number(data.practiceGameScore??nextScore);
      setProfile(v=>({...v,practiceGameScore:syncedScore}));
      save(practiceScoreKey,syncedScore);
      if(data.practiceMilestoneReached&&!reachedMilestone){setConfetti(true);setTimeout(()=>setConfetti(false),4000)}
    }catch(err){setProfile(v=>({...v,practiceGameScore:nextScore}))}
  };
  const nextGame=()=>{setGameAnswer('');setGameQuestion(v=>v+1)};
  const scores=submissions.slice().sort((a,b)=>new Date(b.submittedAt||0)-new Date(a.submittedAt||0)).slice(0,5);
  const scorePercent=item=>Number(item.score||0)/Math.max(Number(item.totalPossible)||1,1)*100;
  const improvement=scores.length>1?Math.round(scorePercent(scores[0])-scorePercent(scores[scores.length-1])):0;
  const gameScore=profile.practiceGameScore||0;
  const currentPracticeQuestion=practiceQuestions[gameQuestion];
  const displayedCorrectCount=confetti?10:correctAnswerCount;
  const practiceGame=<section className="student-card practice-game practice-game-full"><span className="eyebrow">FUN PRACTICE</span><div className="game-top"><h3>{practiceTopic} Challenge</h3><strong>{gameScore} pts</strong></div><div className="game-progress"><i style={{width:`${displayedCorrectCount*10}%`}}/></div>{currentPracticeQuestion?<><p className="game-question">{currentPracticeQuestion.q}</p><div className="game-options">{currentPracticeQuestion.options.map(option=><button key={option} type="button" disabled={Boolean(gameAnswer)} className={gameAnswer===option?(option===currentPracticeQuestion.answer?"game-correct":"game-wrong"):gameAnswer&&option===currentPracticeQuestion.answer?"game-correct":""} onClick={()=>answerGame(option)}>{option}</button>)}</div>{gameAnswer&&<div className={`game-feedback ${gameAnswer===currentPracticeQuestion.answer?"success":"error"}`}>{gameAnswer===currentPracticeQuestion.answer?"Correct! +10 points":"Not quite. Try the next new question."}</div>}{gameAnswer&&<button className="primary" onClick={nextGame}>Next question</button>}</>:<div className="practice-exhausted"><strong>No new questions left for this topic.</strong><span>Choose another topic to continue. Answered questions will stay out of your practice set.</span></div>}</section>
  return <div className="student-dashboard">
    {confetti&&<div className="confetti-layer" aria-hidden="true">{Array.from({length:36}).map((_,i)=><i key={i} style={{'--i':i,'--x':`${(i*37)%100}%`}}/>)}<div className="confetti-message">10 correct! 🎉</div></div>}
    <aside className="student-sidebar"><div className="sl-brand"><div className="logo"><span/><span/></div><b>SkillLens</b><em>AI</em></div><nav><button className={`nav ${studentView==='dashboard'?'active':''}`} onClick={()=>setStudentView('dashboard')}><LayoutDashboard size={18}/><span>Learning Dashboard</span></button><button className={`nav ${(studentView==='results'||studentView==='result-detail')?'active':''}`} onClick={()=>setStudentView('results')}><ClipboardCheck size={18}/><span>My Results</span></button><button className={`nav ${studentView==='assessments'?'active':''}`} onClick={()=>setStudentView('assessments')}><BookOpen size={18}/><span>Available Tests</span></button><button className={`nav ${studentView==='practice'?'active':''}`} onClick={()=>setStudentView('practice')}><BookOpen size={18}/><span>Practice Zone</span></button><button className={`nav ${studentView==='profile'?'active':''}`} onClick={()=>setStudentView('profile')}><Settings size={18}/><span>My Profile</span></button></nav><div className="side-bottom"><div className="profile"><div className="avatar">{user.name?.split(/\s+/).map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div><div><b>{user.name}</b><small>Student</small></div></div><button className="logout-btn" onClick={onLogout}>Log out</button></div></aside>
    <main className="student-main"><header className="student-header"><div><span className="eyebrow">STUDENT DASHBOARD</span><h1>{studentView==='result-detail'?'Assessment Details':studentView==='results'?'My Assessment Results':studentView==='assessments'?'Available Tests':studentView==='practice'?'Practice Zone':studentView==='profile'?'My Profile':`Welcome back, ${profile.name||user.name}`}</h1></div><div className="student-xp"><strong>{profile.xp||0} XP · {gameScore} pts</strong><span>🔥 {profile.practiceStreak||0} day streak</span></div></header>
      {studentView==='dashboard'&&<div className="student-dashboard-grid"><section className="student-card progress-card assessment-progress-card"><div className="panel-head"><div><span className="eyebrow">ASSESSMENT ANALYTICS</span><h3>Progress Overview</h3><small className="graph-subtitle">Score trend across your last five completed tests</small></div><strong className={improvement>=0?"improvement-up":"improvement-down"}>{improvement>=0?"+":""}{improvement}%<small className="graph-trend-label">overall change</small></strong></div>{loading?<p>Loading assessment progress...</p>:scores.length?<><AssessmentProgressChart scores={scores}/></>:<div className="empty-dashboard"><BookOpen size={30}/><h3>No assessment history yet</h3><p>Complete an assessment to see your last five scores here.</p></div>}</section><section className="student-card assessment-summary-card"><div className="panel-head"><div><span className="eyebrow">YOUR SUMMARY</span><h3>Assessments given</h3></div><ClipboardCheck size={19}/></div><div className="assessment-summary-total"><strong>{submissions.length}</strong><span>{submissions.length===1?"assessment completed":"assessments completed"}</span></div><div className="assessment-summary-stats"><div><span>Average score</span><b>{submissions.length?Math.round(submissions.reduce((sum,item)=>sum+(Number(item.score||0)/Math.max(Number(item.totalPossible)||1,1))*100,0)/submissions.length):0}%</b></div><div><span>Passed</span><b>{submissions.filter(item=>item.result?.passed).length}</b></div></div><button className="secondary" onClick={()=>setStudentView("results")}>View my results <ChevronRight size={14}/></button></section></div>}
      {studentView==="results"&&<div className="student-results-view"><div className="student-results-actions"><button className="secondary" onClick={()=>setStudentView("assessments")}>Take new assessment</button><button className="secondary" onClick={()=>setStudentView("practice")}>Practice weak concepts</button></div>{loading?<p>Loading results...</p>:submissions.length?submissions.map((item,i)=>{const score=Number(item.score??item.result?.score)||0;const total=Number(item.totalPossible??item.result?.totalPossible)||0;const percent=total?Math.round(score/total*100):0;const summary=item.result?.summary||item.result?.mentorFeedback||(item.needsReview?"Waiting for mentor feedback.":"View your feedback and question review.");return <button type="button" className="student-card student-result-summary" key={item.id||i} onClick={()=>{setSelectedResult(item);setStudentView("result-detail")}}><div className="result-summary-main"><span className="eyebrow">ASSESSMENT RESULT</span><h3>{item.title||"Assessment"}</h3><small>{item.subject?`${item.subject} · `:""}{item.topic?`${item.topic} · `:""}{item.submittedAt?new Date(item.submittedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Recently completed"}</small><p>{summary.length>145?`${summary.slice(0,142)}…`:summary}</p></div><div className="result-summary-score"><strong>{score}<small> / {total}</small></strong><span>{percent}%</span><em className={`status ${item.needsReview?"draft":(item.result?.passed?"published":"closed")}`}>{item.needsReview?"Review pending":(item.result?.passed?"Passed":"Needs practice")}</em></div><ChevronRight className="result-summary-chevron" size={18}/></button>}) : <div className="student-card empty-dashboard"><BookOpen size={30}/><h3>No results yet</h3><p>Complete an assessment and your result history will appear here.</p></div>}</div>}
      {studentView==="result-detail"&&selectedResult&&<div className="student-result-detail-page"><div className="student-results-actions"><button className="secondary" onClick={()=>setStudentView("results")}><ArrowLeft size={15}/> Back to My Results</button></div><section className="content-panel result-detail-hero"><div className="result-detail-heading"><div><span className="eyebrow">ASSESSMENT REVIEW</span><h2>{selectedResult.title||"Assessment"}</h2><p>{selectedResult.subject||""}{selectedResult.topic?` · ${selectedResult.topic}`:""}{selectedResult.submittedAt?` · ${new Date(selectedResult.submittedAt).toLocaleDateString()}`:""}</p></div><em className={`status ${selectedResult.needsReview?"draft":(selectedResult.result?.passed?"published":"closed")}`}>{selectedResult.needsReview?"Review pending":(selectedResult.result?.passed?"Passed":"Needs practice")}</em></div><div className="result-detail-stats"><div><span>YOUR SCORE</span><strong>{Number(selectedResult.score??selectedResult.result?.score)||0}<small> / {Number(selectedResult.totalPossible??selectedResult.result?.totalPossible)||0}</small></strong></div><div><span>PERCENTAGE</span><strong>{Number(selectedResult.totalPossible??selectedResult.result?.totalPossible)?Math.round((Number(selectedResult.score??selectedResult.result?.score)||0)/Number(selectedResult.totalPossible??selectedResult.result?.totalPossible)*100):0}%</strong></div><div><span>PASSING MARKS</span><strong>{selectedResult.passingMarks??"—"}</strong></div></div></section>{selectedResult.result?.mentorFeedback&&<section className="student-card result-feedback-panel"><span className="eyebrow">MENTOR FEEDBACK</span><p>{selectedResult.result.mentorFeedback}</p></section>}<section className="student-card result-feedback-panel"><span className="eyebrow">RESULT SUMMARY</span><p>{selectedResult.result?.summary||"Detailed feedback has not been added yet."}</p><div className="student-feedback-columns"><div><b>Strengths</b><ul>{(selectedResult.result?.strengths||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><b>Improve next</b><ul>{(selectedResult.result?.gaps||selectedResult.result?.improvements||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div></div>{(selectedResult.result?.nextSteps||[]).length>0&&<div className="student-next-steps"><b>Recommended next steps</b><ul>{selectedResult.result.nextSteps.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}</section><section className="student-card result-questions-panel"><span className="eyebrow">QUESTION REVIEW</span><StudentAnswerReview reviews={selectedResult.questionReview||selectedResult.result?.questionReview||[]}/></section></div>}
      {studentView==="assessments"&&<div className="student-results-view"><div className="student-results-actions"><button className="secondary" onClick={()=>setStudentView("dashboard")}>Back to Dashboard</button></div>{availableAssessments.length?availableAssessments.map(a=><section className="student-card available-test-card" key={a.id||a._id}><div className="available-test-heading"><h3>{a.title||"Assessment"}</h3><p><span>Topic</span>{a.topic||"Not specified"}</p></div><div className="available-test-meta"><span><Clock3 size={15}/>{a.duration||30} min</span><span><BarChart3 size={15}/>{a.totalMarks||0} marks</span></div><button className="primary" onClick={()=>window.location.href=`/assessment/${assessmentToken(a)}`}>Start Assessment <ChevronRight size={15}/></button></section>):<div className="student-card empty-dashboard"><ClipboardCheck size={30}/><h3>No active tests available right now</h3><p>When your mentor publishes and activates an assessment, it will show up here.</p></div>}</div>}
      {studentView==='practice'&&<div className="student-practice-view"><section className="student-card practice-intro"><span className="eyebrow">DAILY PRACTICE</span><h2>Build skills without affecting assessment scores</h2><p>Practice your selected topic. Correct answers add points; your milestone comes after 10 correct answers. Wrong answers do not count toward the milestone.</p><form className="practice-topic-form" onSubmit={event=>{event.preventDefault();updatePracticeTopic(practiceTopicDraft)}}><label htmlFor="practice-topic-input">Enter a topic</label><div><input id="practice-topic-input" value={practiceTopicDraft} onChange={event=>setPracticeTopicDraft(event.target.value)} placeholder="e.g. Flowcharts"/><button className="primary" type="submit" disabled={!practiceTopicDraft.trim()}>Start practice</button></div><small>Answered questions will not repeat.</small></form><button className="primary" onClick={checkIn} disabled={checkInLoading||profile.lastPracticeDate===practiceDayKey()}>{checkInLoading?'Checking in…':profile.lastPracticeDate===practiceDayKey()?'Checked in today ✓':'Practice check-in +10 XP'}</button>{checkInMessage&&<p className="checkin-message">{checkInMessage}</p>}</section>{practiceGame}<section className="student-card streak-card"><span className="eyebrow">YOUR STREAK</span><div className="streak-ring"><strong>{profile.practiceStreak||0}</strong><span>days</span></div>{(profile.certificates||[]).length>0&&<div className="certificate-list"><b>Certificates earned</b>{profile.certificates.map((c,i)=><span key={i}>🏅 {c.name}</span>)}</div>}</section></div>}
      {studentView==='profile'&&<div className="student-profile-view"><section className="student-card profile-card"><div className="profile-photo-editor"><div className="profile-photo-large">{profile.profilePhoto?<img src={profile.profilePhoto} alt="Profile"/>:<span>{profile.name?.split(/\s+/).map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>}</div><label className="secondary upload-photo">Choose profile photo<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){setCheckInMessage('Choose a profile photo under 2 MB.');return}const reader=new FileReader();reader.onload=()=>setProfile(v=>({...v,profilePhoto:reader.result}));reader.readAsDataURL(file)}}/></label></div><form className="student-profile-form" onSubmit={saveProfile}><label>Full name<input value={profile.name||''} onChange={e=>setProfile(v=>({...v,name:e.target.value}))}/></label><label>Email<input type="email" value={profile.email||''} onChange={e=>setProfile(v=>({...v,email:e.target.value}))}/></label><label>House name<input value={profile.houseName||''} onChange={e=>setProfile(v=>({...v,houseName:e.target.value}))}/></label><label>Class<input value={profile.className||''} onChange={e=>setProfile(v=>({...v,className:e.target.value}))}/></label><label>Roll number<input value={profile.rollNumber||''} onChange={e=>setProfile(v=>({...v,rollNumber:e.target.value}))}/></label><button className="primary" type="submit">Save profile</button>{checkInMessage&&<p className="checkin-message">{checkInMessage}</p>}</form></section></div>}
    </main>
  </div>
}

function MentorView({ active, assessments, mentorName, setEditing, updateAssessments, notify }) {
  if (active === 'My Assessments') return <MentorAssessments assessments={assessments} setEditing={setEditing} updateAssessments={updateAssessments} notify={notify} />;
  if (active === 'Student Submissions') return <MentorSubmissions />;
  if (active === 'AI Insights') return <MentorInsights assessments={assessments} />;
  return <MentorDashboard assessments={assessments} mentorName={mentorName} setEditing={setEditing} updateAssessments={updateAssessments} notify={notify} />;
}

function Login({ onLogin }) {
  const [mode,setMode]=useState('login');const [audience,setAudience]=useState(()=>window.location.pathname.startsWith('/student')?'student':'mentor');const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  const submit=async(e)=>{e.preventDefault();setLoading(true);setError('');try{const endpoint=mode==='signup'?'/auth/register':'/auth/login';const payload=mode==='signup'?{name,email,password}:{email,password};const {data}=await api.post(endpoint,payload);if(mode==='signup'&&audience==='mentor')return setError('Student signup is available here; mentor accounts are assigned separately.');onLogin(data)}catch(err){const apiError=err.response?.data?.error;setError(apiError||(err.code==='ERR_NETWORK'?'Cannot reach the SkillLens API. Start the backend and try again.':audience==='student'?'Unable to access student account':'Unable to sign in to the mentor account.'))}finally{setLoading(false)}};
  return <div className="login-page"><div className="login-card login-card-wide"><div className="login-brand"><div className="logo"><span/><span/></div><b>SkillLens</b><em>AI</em></div><div className="audience-switch"><button type="button" className={audience==='mentor'?'active':''} onClick={()=>{setAudience('mentor');setMode('login')}}>Mentor</button><button type="button" className={audience==='student'?'active':''} onClick={()=>setAudience('student')}>Student</button></div><div className="login-copy"><span>{audience==='student'?'STUDENT LEARNING':'MENTOR ACCESS'}</span><h1>{mode==='signup'?'Create student account':audience==='student'?'Student login':'Welcome back'}</h1><p>{audience==='student'?'Track assessment progress, review feedback, practice missed concepts and build streaks.':'Sign in to create assessments and review student submissions.'}</p></div>{error&&<div className="login-error">{error}</div>}<form onSubmit={submit}>{audience==='student'&&mode==='signup'&&<label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder={audience==='student'?'student@example.com':'mentor@example.com'}/></label><label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password"/></label><button className="login-submit" disabled={loading}>{loading?'Please wait...':mode==='signup'?'Create account':'Sign in'}<ChevronRight size={17}/></button></form>{audience==='student'&&<div className="auth-mode-link"><button type="button" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('')}}>{mode==='login'?'New student? Create an account':'Already have an account? Sign in'}</button></div>}{import.meta.env.DEV&&audience==='mentor'&&<div className="demo-accounts"><b>Local development demo account only</b><span><strong>Mentor:</strong> skillens@gmail.com / prateiksha123</span></div>}</div></div>
}

function StudentAnswerReview({ reviews = [] }) { const [open, setOpen] = useState(false); const [selected, setSelected] = useState({}); const [checked, setChecked] = useState({}); return <div className="answer-review-section">{reviews.length > 0 && <><button className="review-mistakes-button" type="button" onClick={() => setOpen(v => !v)}>{open ? 'Hide answer review' : 'Review answers and practice mistakes'}<ChevronRight size={16} /></button>{open && <div className="answer-review-list">{reviews.map((review, index) => { const key = review.index == null ? index : review.index; const isCorrect = Array.isArray(review.correctAnswer) ? review.correctAnswer.includes(selected[key]) : review.correctAnswer === selected[key]; return <div className={`answer-review-item ${review.correct ? 'is-correct' : 'is-wrong'}`} key={key}><div className="answer-review-head"><span>Question {Number(review.index) + 1}</span><strong>{review.correct ? 'Correct' : 'Needs practice'}</strong></div><h4>{review.text}</h4><p className="answer-explanation">{review.explanation}</p>{!review.correct && Array.isArray(review.options) && review.options.length > 0 && <div className="practice-mini"><b>Try again</b>{review.options.map((option, optionIndex) => { const chosen = selected[key] === option; const optionCorrect = Array.isArray(review.correctAnswer) ? review.correctAnswer.includes(option) : review.correctAnswer === option; return <button type="button" key={optionIndex} className={`${chosen ? 'selected' : ''} ${checked[key] && optionCorrect ? 'practice-correct' : ''} ${checked[key] && chosen && !optionCorrect ? 'practice-wrong' : ''}`} onClick={() => setSelected(v => ({ ...v, [key]: option }))}>{option}</button> })}<button className="check-practice" type="button" disabled={selected[key] === undefined} onClick={() => setChecked(v => ({ ...v, [key]: true }))}>Check answer</button>{checked[key] && <small>{isCorrect ? 'Correct! Well done.' : 'Not quite — review the explanation and try once more.'}</small>}</div>}</div> })}</div>}</>}</div> }
function PublicAssessment({ token }) {
  const [assessment, setAssessment] = useState(null); const [unavailable, setUnavailable] = useState(''); const [student, setStudent] = useState(() => { const session = load('skilllens_user', null); const u = session?.user || session; return { name: u?.name || '', email: u?.email || '' }; }); const [stage, setStage] = useState('loading'); const [attempt, setAttempt] = useState(null); const [answers, setAnswers] = useState({}); const [remaining, setRemaining] = useState(0); const [current, setCurrent] = useState(0); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { api.get(`/assessments/public/${token}`).then(({ data }) => { if (data.availabilityError) { setUnavailable(data.availabilityError); setStage('unavailable') } else { setAssessment(data.assessment || null); setStage('register') } }).catch(err => { setUnavailable(err.response?.data?.error || 'Assessment not found'); setStage('unavailable') }) }, [token]);
  useEffect(() => { if (stage === 'assessment' && remaining > 0) { const timer = setInterval(() => setRemaining(r => { if (r <= 1) { clearInterval(timer); submit(true); return 0 } return r - 1 }), 1000); return () => clearInterval(timer) } }, [stage]);
  useEffect(() => { if (stage === 'confirmed' || stage === 'submitted') { window.history.replaceState({ assessmentCompleted: true }, '', window.location.pathname); const preventBack = () => window.history.pushState({ assessmentCompleted: true }, '', window.location.pathname); window.addEventListener('popstate', preventBack); return () => window.removeEventListener('popstate', preventBack) } }, [stage]);
  const submit = async (auto = false) => {
    if (!attempt || submitting) return;
    if (!auto && !window.confirm('Submit this assessment now? You will not be able to change your answers after submission.')) return;
    setSubmitting(true);
    const payload = { answers: Object.entries(answers).map(([questionIndex, answer]) => ({ questionIndex: Number(questionIndex), answer })) };
    try {
      const { data } = await api.post(`/assessments/public/${token}/attempt/${attempt.attemptId}/submit`, payload);
      const score = data.score;
      const total = data.totalMarks || assessment?.totalMarks || 0;
      const savedSubmission = { confirmation: data.confirmation, score: data.score ?? score, totalMarks: data.totalMarks || total, result: data.result || null };
      setAttempt({ ...attempt, ...savedSubmission });
      setStage('confirmed');
      const studentEmail = (student.email || attempt.studentEmail || '').trim().toLowerCase();
      const submissionRecord = {
        id: attempt.attemptId || String(Date.now()),
        assessmentId: assessment?._id || assessment?.id,
        title: assessment?.title || 'Assessment',
        subject: assessment?.subject || '',
        topic: assessment?.topic || '',
        submittedAt: new Date().toISOString(),
        status: data.result?.status || 'Submitted',
        score: data.score ?? score ?? 0,
        totalPossible: data.totalMarks || total || 0,
        studentEmail,
        needsReview: data.result?.needsReview || false,
        result: data.result || {},
        questionReview: data.result?.questionReview || []
      };
      if (studentEmail) {
        const existing = load(`skilllens_student_submissions_${studentEmail}`, []) || [];
        save(`skilllens_student_submissions_${studentEmail}`, [submissionRecord, ...existing.filter(x => x.id !== submissionRecord.id)]);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Submission could not be saved. Please try again.';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };
  const start = async () => { if (!assessment) return; if (!student.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) return alert('Enter your full name and a valid email address'); const allowed = (assessment.allowedEmails || []).map(email => String(email).trim().toLowerCase()).filter(Boolean); if (allowed.length && !allowed.includes(student.email.trim().toLowerCase())) return alert('Your email is not allowed to take this assessment. Please contact your mentor.'); try { const { data } = await api.post(`/assessments/public/${token}/start`, { name: student.name, email: student.email }); setAttempt(data); if (data.assessment) setAssessment(data.assessment); if (data.status === 'Submitted' || data.status === 'Evaluated') { setStage('confirmed'); return } const restored = Array.isArray(data.answers) ? data.answers : []; const restoredAnswers = {}; restored.forEach(a => { restoredAnswers[a.questionIndex] = a.answer }); setAnswers(restoredAnswers); const seconds = data.remainingTime || Number(assessment.duration) * 60; setRemaining(seconds); setStage('instructions') } catch (err) { alert(err.response?.data?.error || 'Unable to start assessment') } };
  const begin = () => setStage('assessment');
  const saveAnswers = async (next) => { setAnswers(next); if (attempt?.attemptId) api.put(`/assessments/public/${token}/attempt/${attempt.attemptId}/answers`, { answers: Object.entries(next).map(([questionIndex, answer]) => ({ questionIndex: Number(questionIndex), answer })) }).catch(() => { }) };
  if (stage === 'loading') return <div className="public-assessment loading-state"><div className="public-logo">SkillLens <em>AI</em></div><h2>Loading assessment...</h2></div>;
  if (stage === 'unavailable') return <div className="public-assessment unavailable"><div className="public-logo">SkillLens <em>AI</em></div><div className="unavailable-card"><div className="lock-icon"><X size={28} /></div><h2>Assessment unavailable</h2><p>{unavailable || 'This assessment is currently unavailable. Please contact your mentor.'}</p></div></div>;
  const completedScore=Number(attempt?.score??attempt?.result?.score);
  const completedTotal=Number(attempt?.totalMarks??attempt?.result?.totalPossible??assessment?.totalMarks);
  const completedPercent=Number.isFinite(completedScore)&&Number.isFinite(completedTotal)&&completedTotal>0?Math.round(completedScore/completedTotal*100):null;
  const scoreNeedsReview=Boolean(attempt?.result?.needsReview);
  if (stage === 'confirmed' || stage === 'submitted') return <div className="public-assessment"><div className="public-logo">SkillLens <em>AI</em></div><section className="confirmation-card student-completion-card"><div className="confirmation-icon"><CheckCircle2 size={40}/></div><span className="eyebrow">ASSESSMENT COMPLETED</span><h1>Assessment completed!</h1><p>{attempt?.studentName||student.name||'Student'}, your assessment has been submitted successfully.</p>{completedPercent!==null?<div className="completion-score"><span>{scoreNeedsReview?'Score so far':'Your score'}</span><strong>{completedPercent}%</strong><small>{completedScore} / {completedTotal} marks{scoreNeedsReview?' · Final score pending mentor review':''}</small></div>:<p className="completion-review-pending">Your score will appear after mentor review.</p>}<blockquote className="completion-quote">“Every step forward is progress. Keep learning, keep growing.”</blockquote><button className="primary student-dashboard-link" type="button" onClick={()=>{window.location.href='/student'}}>Open Student Dashboard</button></section></div>;
  if (stage === 'instructions') return <div className="public-assessment"><div className="public-logo">SkillLens <em>AI</em></div><div className="instructions-card"><span className="eyebrow">ASSESSMENT INSTRUCTIONS</span><h1>{assessment.title}</h1><div className="instruction-meta"><span>{assessment.topic}</span><span>{assessment.difficulty}</span><span>{assessment.duration} minutes</span><span>{assessment.totalMarks} marks</span></div><div className="instructions-box"><h3>Before you begin</h3><p>{assessment.instructions || assessment.description || 'Answer every question carefully. The timer starts when you click Start Assessment and cannot be paused.'}</p></div><button className="primary" onClick={begin}>Start Assessment</button></div></div>;
  if (stage === 'assessment') return <div className="assessment-runner"><header><div className="public-logo">SkillLens <em>AI</em></div><h2>{assessment.title}</h2><div className="timer-display"><Clock3 size={17} />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</div></header><div className="runner-layout"><aside><h3>Questions</h3><div className="question-nav">{assessment.questions.map((q, i) => <button key={i} title={`Question ${i + 1}`} className={`${current === i ? 'current' : ''} ${answers[i] !== undefined ? 'answered' : ''}`} onClick={() => setCurrent(i)}>{i + 1}</button>)}</div><div className="nav-legend"><span><i className="answered-dot" />Answered</span></div></aside><main><div className="runner-question"><div className="answer-head"><b>{current + 1}</b><span>{normalizeSection(assessment.questions[current]?.section, assessment.questions[current]?.type)}</span><span>{assessment.questions[current]?.type}</span><em>{assessment.questions[current]?.marks} marks</em></div><h3>{assessment.questions[current]?.text}</h3>{(assessment.questions[current]?.type === 'Multiple Choice' || assessment.questions[current]?.type === 'Multiple Select') && <div className="question-output-image">{(assessment.questions[current]?.imageData || assessment.questions[current]?.flowchartSvg || assessment.questions[current]?.generatedFlowchartImage) && <><h4>Study the flowchart/code output image and choose the expected output</h4><img className="runner-question-image" src={assessment.questions[current].flowchartSvg ? svgFlowchartDataUri(assessment.questions[current].flowchartSvg) : assessment.questions[current].generatedFlowchartImage || assessment.questions[current].imageData} alt="Expected output question reference" /></>}</div>}{assessment.questions[current]?.type === 'Multiple Choice' ? <div className="radio-options">{assessment.questions[current].options.map((option, j) => <label key={j}><input type="radio" checked={answers[current] === option} onChange={() => saveAnswers({ ...answers, [current]: option })} /><span>{option}</span></label>)}</div> : assessment.questions[current]?.type === 'Multiple Select' ? <div className="radio-options">{assessment.questions[current].options.map((option, j) => <label key={j}><input type="checkbox" checked={(answers[current] || []).includes(option)} onChange={() => { const selected = answers[current] || []; saveAnswers({ ...answers, [current]: selected.includes(option) ? selected.filter(x => x !== option) : [...selected, option] }) }} /><span>{option}</span></label>)}</div> : assessment.questions[current]?.answerType === 'Choose File' || assessment.questions[current]?.type === 'File Upload' ? <div className="file-upload-answer"><div className="flowchart-help"><b>Choose a file</b><p>Upload your completed work for this practical question.</p></div><input type="file" multiple onChange={async e => { const files = Array.from(e.target.files || []); const uploaded = await Promise.all(files.map(file => new Promise((resolve, reject) => { if (file.size > 6 * 1024 * 1024) { reject(new Error('Each file must be smaller than 6 MB')); return } const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result }); reader.onerror = reject; reader.readAsDataURL(file) }))).catch(err => { alert(err.message); return null }); if (uploaded) saveAnswers({ ...answers, [current]: uploaded }) }} /><div className="uploaded-files">{Array.isArray(answers[current]) && answers[current].map((file, i) => <span key={i}>📄 {file.name}</span>)}</div></div> : assessment.questions[current]?.type === 'Flowchart' ? <div className="flowchart-answer"><div className="flowchart-help"><b>Upload your flowchart</b><p>Upload a clear image of the flowchart you created for this task.</p></div><input className="flowchart-image-input" type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 4 * 1024 * 1024) { alert('Each image must be smaller than 4 MB'); return } try { const imageData = await compressAssessmentImage(file); saveAnswers({ ...answers, [current]: { kind: 'flowchart', imageData, imageName: file.name } }) } catch (err) { alert(err.message) } }} />{typeof answers[current] === 'object' && answers[current]?.imageData && <div className="uploaded-flowchart-preview"><img src={answers[current].imageData} alt={answers[current].imageName || 'Uploaded flowchart'} /><button type="button" onClick={() => saveAnswers({ ...answers, [current]: null })}>Remove image</button></div>}</div> : assessment.questions[current]?.type === 'HTML/CSS Upload' ? <div className="file-upload-answer"><div className="flowchart-help"><b>Upload practical files</b><p>Upload HTML, CSS, JavaScript, image, or ZIP files.</p></div><input type="file" accept=".html,.htm,.css,.js,.zip,image/*" multiple onChange={async e => { const files = Array.from(e.target.files || []); const uploaded = await Promise.all(files.map(file => new Promise((resolve, reject) => { if (file.size > 4 * 1024 * 1024) { reject(new Error('Each file must be smaller than 4 MB')); return } const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result }); reader.onerror = reject; reader.readAsDataURL(file) }))).catch(err => { alert(err.message); return null }); if (uploaded) saveAnswers({ ...answers, [current]: uploaded }) }} /><div className="uploaded-files">{Array.isArray(answers[current]) && answers[current].map((file, i) => <span key={i}>📄 {file.name}</span>)}</div></div> : <textarea rows="7" placeholder="Type your answer here..." value={answers[current] || ''} onChange={e => saveAnswers({ ...answers, [current]: e.target.value })} />}</div><div className="runner-actions"><div><button className="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous</button><button className="primary" disabled={current === assessment.questions.length - 1} onClick={() => setCurrent(current + 1)}>Next</button></div></div><button className="submit-assessment" disabled={submitting} onClick={() => submit(false)}>{submitting ? 'Submitting...' : 'Submit Assessment'}</button></main></div></div>;
  return <div className="public-assessment"><div className="public-logo">SkillLens <em>AI</em></div><div className="instructions-card student-registration"><span className="eyebrow">STUDENT INFORMATION</span><h1>{assessment.title}</h1><p>Enter your details before starting the assessment.</p><label>Full Name<input value={student.name} onChange={e => setStudent({ ...student, name: e.target.value })} placeholder="Your full name" /></label><label>Email Address<input type="email" value={student.email} onChange={e => setStudent({ ...student, email: e.target.value })} placeholder="student@example.com" /></label><button className="primary" onClick={start}>Continue to Instructions</button></div></div>
}

function toggleAssessmentLink(a, assessments, updateAssessments, notify) { const next = !a.isActive; updateAssessments(assessments.map(x => x.id === a.id || x._id === a._id ? { ...x, isActive: next } : x)); api.patch(`/assessments/${a.id || a._id}/link`, { isActive: next }).catch(() => { }); notify(next ? 'Assessment link activated' : 'Assessment link deactivated') }

function MentorDashboard({ assessments, mentorName, setEditing, updateAssessments, notify }) { const [submissionStats, setSubmissionStats] = useState({ attempts: 0, completed: 0 }); useEffect(() => { api.get('/assessments/submissions/mentor').then(({ data }) => { const items = Array.isArray(data) ? data : []; setSubmissionStats({ attempts: items.length, completed: items.filter(i => i.status === 'Submitted' || i.status === 'Evaluated' || i.status === 'submitted').length }) }).catch(() => { }) }, []); const draft = assessments.filter(a => a.status === 'draft').length, published = assessments.filter(a => a.status === 'published' || a.status === 'closed').length, active = assessments.filter(a => a.isActive && a.status === 'published').length; return <div className="dashboard-content"><section className="welcome-row"><div><span className="eyebrow">WELCOME BACK, {mentorName.toUpperCase()}</span><h2>Create, manage and publish assessments</h2></div><button className="primary" onClick={() => setEditing(emptyAssessment())}><Plus size={17} />Create Assessment</button></section><div className="stats"><Stat label="TOTAL ASSESSMENTS" value={assessments.length} tone="purple" /><Stat label="PUBLISHED" value={published} tone="green" /><Stat label="ACTIVE LINKS" value={active} tone="orange" /><Stat label="STUDENT ATTEMPTS" value={submissionStats.attempts} tone="pink" /><Stat label="COMPLETED" value={submissionStats.completed} tone="purple" /></div><section className="content-panel"><div className="panel-head"><div><span className="eyebrow">ASSESSMENTS</span><h3>My assessments</h3></div><button className="period">Newest first <ChevronRight size={14} /></button></div>{assessments.length ? assessments.map(a => <div className="assessment-card" key={a.id}><div className="assessment-icon"><ClipboardCheck size={21} /></div><div className="assessment-main"><h3>{a.title || 'Untitled assessment'}</h3><p>{a.subject} <i /> {a.phase} <i /> {a.topic || 'No topic'}</p><div className="meta-pills"><span>{a.difficulty}</span><span>{a.questions.length} question{a.questions.length !== 1 ? 's' : ''}</span><span>{a.duration} min</span></div></div><div className="card-actions"><em className={`status ${a.status}`}>{a.status === 'closed' ? 'Closed' : a.isActive ? 'Active' : a.status === 'published' ? 'Published' : 'Draft'}</em><small>{new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small>{a.status === 'published' && <div className="link-control"><input readOnly value={`${window.location.origin}/assessment/${assessmentToken(a)}`} /><button title="Copy assessment link" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/assessment/${assessmentToken(a)}`); notify('Assessment link copied') }}>Copy</button><button title={a.isActive ? 'Deactivate link' : 'Activate link'} className={a.isActive ? 'deactivate' : 'activate'} onClick={() => toggleAssessmentLink(a, assessments, updateAssessments, notify)}>{a.isActive ? 'Deactivate' : 'Activate'}</button></div>}<div><button title="Edit" onClick={() => setEditing({ ...a })}><Pencil size={15} /></button><button title="Delete" onClick={() => { if (confirm('Delete this assessment?')) { updateAssessments(assessments.filter(x => x.id !== a.id)); notify('Assessment deleted') } }}><Trash2 size={15} /></button></div></div></div>) : <div className="empty"><BookOpen size={30} /><h3>No assessments yet</h3><p>Create your first assessment to get started.</p></div>}</section></div> }
function Stat({ label, value, tone }) { return <div className="stat"><div className={`stat-icon ${tone}`}><ClipboardCheck size={20} /></div><div><span>{label}</span><strong>{value}</strong></div></div> }
function MentorInsights({ assessments }) { const [items, setItems] = useState([]); useEffect(() => { api.get('/assessments/submissions/mentor').then(({ data }) => setItems(Array.isArray(data) ? data : [])).catch(() => setItems([])) }, []); const avg = items.length ? Math.round(items.reduce((sum, i) => sum + ((i.score || 0) / Math.max(1, i.totalPossible || 1) * 100), 0) / items.length) : 0; return <div className="dashboard-content"><section className="welcome-row"><div><span className="eyebrow">PERFORMANCE INSIGHTS</span><h2>Assessment overview</h2></div></section><div className="stats"><Stat label="ASSESSMENTS" value={assessments.length} tone="purple" /><Stat label="SUBMISSIONS" value={items.length} tone="pink" /><Stat label="AVERAGE SCORE" value={`${avg}%`} tone="green" /><Stat label="NEEDING REVIEW" value={items.filter(i => i.needsReview).length} tone="orange" /></div><section className="content-panel"><div className="panel-head"><div><span className="eyebrow">LATEST ACTIVITY</span><h3>Submission highlights</h3></div></div>{items.length ? items.slice(0, 8).map(i => <div className="submission-row" key={i.id}><div className="student-avatar">{(i.studentName || 'S').slice(0, 1).toUpperCase()}</div><div className="submission-main"><h3>{i.studentName || 'Student'}</h3><p>{i.title || 'Assessment'}</p></div><div className="submission-score-small"><strong>{i.score || 0}/{i.totalPossible || 0}</strong></div></div>) : <div className="empty"><BarChart3 size={30} /><h3>No performance data yet</h3><p>Insights will appear after students submit assessments.</p></div>}</section></div> }
function MentorAssessments({ assessments, setEditing, updateAssessments, notify }) { return <div className="dashboard-content"><section className="welcome-row"><div><span className="eyebrow">ASSESSMENT LIBRARY</span><h2>My Assessments</h2></div><button className="primary" onClick={() => setEditing(emptyAssessment())}><Plus size={17} />Create Assessment</button></section><section className="content-panel"><div className="panel-head"><div><span className="eyebrow">ALL ASSESSMENTS</span><h3>{assessments.length} assessments</h3></div></div>{assessments.map(a => <div className="assessment-card" key={a.id || a._id}><div className="assessment-icon"><ClipboardCheck size={21} /></div><div className="assessment-main"><h3>{a.title}</h3><p>{a.subject} <i /> {a.topic || 'No topic'} <i /> {a.difficulty}</p><div className="meta-pills"><span>{a.questions?.length || 0} questions</span><span>{a.duration} min</span><span>{a.totalMarks} marks</span></div></div><div className="card-actions"><em className={`status ${a.status}`}>{a.isActive ? 'Active' : a.status === 'published' ? 'Published' : a.status === 'closed' ? 'Closed' : 'Draft'}</em><div><button title="Edit" onClick={() => setEditing({ ...a })}><Pencil size={15} /></button><button title="Delete" onClick={() => { if (confirm('Delete this assessment?')) { updateAssessments(assessments.filter(x => (x.id || x._id) !== (a.id || a._id))); notify('Assessment deleted') } }}><Trash2 size={15} /></button></div></div></div>)}</section></div> }
function MentorSubmissionDetail({ item, onBack, onRemove, onFeedbackUpdated }) {
  const feedback = item.result || {};
  const [feedbackText, setFeedbackText] = useState(feedback.mentorFeedback || '');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  const saveFeedback = async () => {
    setSaving(true);
    setSavedNotice('');
    try {
      await api.patch(`/assessments/submissions/${item.id}/feedback`, { feedback: feedbackText });
      onFeedbackUpdated(item.id, feedbackText);
      setSavedNotice('Feedback saved and sent to student dashboard!');
      setTimeout(() => setSavedNotice(''), 3500);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save feedback');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-content student-detail-page">
      <section className="welcome-row">
        <button className="secondary" onClick={onBack}><ArrowLeft size={16} /> Back to submissions</button>
      </section>
      <section className="content-panel student-detail-head">
        <div className="student-avatar large">{(item.studentName || item.studentEmail || 'S').split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div>
          <span className="eyebrow">STUDENT DETAILS</span>
          <h2>{item.studentName || 'Student'}</h2>
          <p>{item.studentEmail || 'Email unavailable'} • {item.title || 'Assessment'}</p>
        </div>
        <div className="submission-score-small">
          <strong>{item.score ?? feedback.score ?? 0}/{item.totalPossible ?? feedback.totalPossible ?? 0}</strong>
          <small>{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : ''}</small>
        </div>
        <button className="icon-delete-feedback" title="Delete submission and feedback" aria-label="Delete submission and feedback" onClick={() => onRemove(item)}><Trash2 size={18} /></button>
      </section>

      <section className="content-panel">
        <div className="mentor-feedback-editor" style={{ marginTop: 0, borderTop: 0, paddingTop: 0, marginBottom: 20 }}>
          <span className="eyebrow">PERSONALIZED MENTOR FEEDBACK</span>
          <p style={{ fontSize: 12, color: '#697386', margin: '4px 0 8px' }}>Write feedback or guidance for this student. It will be stored and highlighted directly on their dashboard.</p>
          <textarea
            rows={4}
            placeholder="e.g. Great work on flowchart concepts! Focus more on edge cases and loop termination conditions."
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
          />
          <div className="mentor-feedback-actions">
            {savedNotice && <span style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, marginRight: 'auto', alignSelf: 'center' }}>✓ {savedNotice}</span>}
            <button className="primary" disabled={saving} onClick={saveFeedback}>
              {saving ? 'Saving...' : 'Save & Send to Student Dashboard'}
            </button>
          </div>
        </div>

        <div className="feedback-summary">
          <span className="eyebrow">OVERALL AI FEEDBACK</span>
          <p>{feedback.summary || 'Feedback has been saved for this student submission.'}</p>
        </div>

        <div className="feedback-grid answer-feedback-summary">
          <div>
            <h4>Student strengths</h4>
            <ul>{(feedback.strengths?.length ? feedback.strengths : ['No specific strength summary available']).map((text, i) => <li key={i}>{text}</li>)}</ul>
          </div>
          <div>
            <h4>Learning gaps to improve</h4>
            <ul>{(feedback.gaps?.length ? feedback.gaps : (feedback.improvements || [])).map((text, i) => <li key={i}>{text}</li>)}</ul>
          </div>
          <div>
            <h4>Recommended next steps</h4>
            <ul>{(feedback.nextSteps?.length ? feedback.nextSteps : ['Review the assessment material and complete focused practice.']).map((text, i) => <li key={i}>{text}</li>)}</ul>
          </div>
          <div className="correct-answer-card">
            <h4>Correct answers</h4>
            <strong>{feedback.correctCount ?? 0}</strong>
            <p>Questions answered correctly</p>
            <ul className="answer-question-list">{(feedback.correctQuestions?.length ? feedback.correctQuestions : ['No correctly answered questions']).map((text, i) => <li key={i}>{text}</li>)}</ul>
          </div>
          <div className="wrong-answer-card">
            <h4>Wrong answers</h4>
            <strong>{feedback.wrongCount ?? 0}</strong>
            <p>Questions answered incorrectly</p>
            <ul className="answer-question-list">{(feedback.wrongQuestions?.length ? feedback.wrongQuestions : ['No wrong answers']).map((text, i) => <li key={i}>{text}</li>)}</ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function MentorSubmissions() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null);
  useEffect(() => { api.get('/assessments/submissions/mentor').then(({ data }) => setItems(Array.isArray(data) ? data : [])).catch(() => setItems([])).finally(() => setLoading(false)) }, []);
  const removeSubmission = async (item) => { if (!confirm('Remove this submission and all of its stored feedback? This cannot be undone.')) return; try { await api.delete(`/assessments/submissions/${item.id}`); setItems(v => v.filter(i => i.id !== item.id)); setSelected(null) } catch (err) { alert(err.response?.data?.error || 'Unable to remove submission') } };
  const handleFeedbackUpdated = (submissionId, feedbackText) => {
    setItems(v => v.map(it => it.id === submissionId ? { ...it, result: { ...(it.result || {}), mentorFeedback: feedbackText } } : it));
  };
  if (selected) {
    const item = items.find(i => i.id === selected);
    if (item) {
      return (
        <MentorSubmissionDetail
          item={item}
          onBack={() => setSelected(null)}
          onRemove={removeSubmission}
          onFeedbackUpdated={handleFeedbackUpdated}
        />
      );
    }
  }
  return <div className="dashboard-content"><section className="welcome-row"><div><span className="eyebrow">STUDENT ACTIVITY</span><h2>Student Submissions</h2></div></section>
    <div className="stats"><Stat label="TOTAL SUBMISSIONS" value={items.length} tone="purple" /><Stat label="NEEDING REVIEW" value={items.filter(i => i.needsReview).length} tone="orange" /><Stat label="PASSED" value={items.filter(i => i.result?.passed).length} tone="green" /></div>
    <section className="content-panel"><div className="panel-head"><div><span className="eyebrow">SUBMISSIONS</span><h3>{loading ? 'Loading...' : `${items.length} students submitted`}</h3></div></div>
      {items.length ? items.map(item => <button className="submission-row submission-detail-button" key={item.id} onClick={() => setSelected(item.id)}><div className="student-avatar">{(item.studentName || item.studentEmail || 'S').split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div><div className="submission-main"><h3>{item.studentName || 'Student'}</h3><p>{item.studentEmail || 'Email unavailable'} <i /> {item.title || 'Assessment'}</p></div><div className="submission-score-small"><strong>{item.score ?? item.result?.score ?? 0}/{item.totalPossible ?? item.result?.totalPossible ?? 0}</strong><small>{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : ''}</small></div><em className={`status ${item.needsReview ? 'draft' : 'published'}`}>{item.needsReview ? 'Review pending' : 'Completed'}</em><ChevronRight size={16} /></button>) : <div className="empty"><Users size={30} /><h3>No student submissions yet</h3><p>Submitted assessments will appear here.</p></div>}
    </section></div>
}
function AssessmentModal({ assessment, onClose, onSave }) {
  const [mode, setMode] = useState(assessment.title ? 'manual' : 'choice');
  const [form, setForm] = useState({ ...assessment, questions: assessment.questions?.length ? assessment.questions : [emptyQuestion()] });
  const [ai, setAi] = useState({ title: '', description: '', prompt: '', subject: 'Problem Solving', difficulty: 'Beginner', count: '5', type: 'Mixed', duration: form.duration || 30, instructions: '' });
  const [generating, setGenerating] = useState(false);
  const update = (key, value) => setForm(v => ({ ...v, [key]: value }));
  const addQuestion = () => update('questions', [...form.questions, emptyQuestion()]);
  const removeQuestion = (i) => update('questions', form.questions.filter((_, idx) => idx !== i));
  const regenerate = (i) => { const q = form.questions[i]; const options = q.type === 'Multiple Choice' || q.type === 'Multiple Select' ? q.options : undefined; api.post('/assessments/ai/regenerate', { question: q.topic ? q : q.text, topic: form.topic, subject: form.subject, difficulty: q.difficulty, type: q.type, options }).then(({ data }) => { if (data?.question) { const qs = [...form.questions]; qs[i] = { ...qs[i], ...data.question }; update('questions', qs) } }).catch(() => alert('AI regeneration is unavailable. Check the server AI configuration.')) };
  const questionChanged = (i, key, value) => { const qs = [...form.questions]; qs[i] = { ...qs[i], [key]: value }; if (key === 'answerType') { const type = value === 'Multiple Choice' || value === 'Multiple Select' ? value : value === 'Choose File' ? 'File Upload' : 'Paragraph'; qs[i].type = type; qs[i].answerType = value; qs[i].section = value === 'Choose File' || value === 'Paragraph' ? 'Task / Practical' : 'MCQ'; if (value !== 'Multiple Choice' && value !== 'Multiple Select') qs[i].options = [] } if (key === 'type') { qs[i].answerType = value === 'Multiple Choice' ? 'Multiple Choice' : value === 'Multiple Select' ? 'Multiple Select' : value === 'File Upload' ? 'Choose File' : 'Paragraph'; qs[i].section = value === 'File Upload' || value === 'Short Answer' || value === 'Long Answer' || value === 'Paragraph' ? 'Task / Practical' : 'MCQ'; if (value !== 'Multiple Choice' && value !== 'Multiple Select') qs[i].options = [] } update('questions', qs) };
  const validate = () => { if (!form.title.trim()) return 'Assessment title is required'; if (!form.topic.trim()) return 'Topic is required'; if (!form.duration || +form.duration <= 0) return 'Enter a valid duration'; if (!form.questions.length) return 'Add at least one question'; for (const q of form.questions) { if (!q.text.trim()) return 'Every question needs question text'; if ((q.type === 'Multiple Choice' || q.type === 'Multiple Select') && (!q.options?.length || q.options.some(o => !o?.trim()) || !q.correctAnswer || (q.type === 'Multiple Select' && (!Array.isArray(q.correctAnswer) || !q.correctAnswer.length)))) return 'Complete MCQ options and select the correct answer' } return '' };
  const save = (status) => { const error = validate(); if (error) return alert(error); const questions = form.questions.map(q => ({ ...q, answerType: q.answerType || (q.type === 'Multiple Choice' || q.type === 'Multiple Select' ? q.type : q.type === 'File Upload' ? 'Choose File' : 'Paragraph'), section: q.answerType === 'Choose File' || q.answerType === 'Paragraph' || q.type === 'Flowchart' || q.type === 'HTML/CSS Upload' || q.type === 'Coding / Problem Solving' || q.type === 'Short Answer' || q.type === 'Long Answer' ? 'Task / Practical' : 'MCQ' })); onSave({ ...form, questions, id: form.id || form._id || Date.now().toString(), status, createdAt: form.createdAt || new Date().toISOString() }) };
  const generate = async () => { if (!ai.title.trim() || !ai.count || Number(ai.count) < 1) return alert('Enter a title/topic and number of questions'); setGenerating(true); try { const { data } = await api.post('/assessments/ai/generate', { title: ai.title, description: ai.description, subject: ai.subject, difficulty: ai.difficulty, count: Number(ai.count), type: ai.type, duration: Number(ai.duration) || 30, instructions: ai.instructions, prompt: ai.prompt }); const questions = (data.questions || []).map(q => ({ ...emptyQuestion(), ...q, type: q.type || 'Multiple Choice', answerType: q.answerType || (q.type === 'Multiple Choice' || q.type === 'Multiple Select' ? q.type : q.type === 'File Upload' || q.type === 'Flowchart' || q.type === 'HTML/CSS Upload' || q.type === 'Coding / Problem Solving' ? 'Choose File' : 'Paragraph'), marks: String(q.marks || 5), difficulty: q.difficulty || ai.difficulty, options: q.options || ['', '', '', ''], section: q.section || (q.type === 'Flowchart' || q.type === 'Coding / Problem Solving' || q.type === 'HTML/CSS Upload' || q.type === 'File Upload' || q.answerType === 'Choose File' || q.answerType === 'Paragraph' ? 'Task / Practical' : 'MCQ'), correctAnswer: q.correctAnswer || '', expectedAnswer: q.expectedAnswer || '', evaluationGuidelines: q.evaluationGuidelines || '' })); setForm(v => ({ ...v, title: ai.title, subject: ai.subject, topic: ai.title, difficulty: ai.difficulty, duration: String(ai.duration || 30), instructions: ai.instructions || v.instructions, questions: questions.length ? questions : [emptyQuestion()], status: 'draft', isActive: false })); setMode('editor'); if (data.previewFallback) alert('AI API key is not configured. The app loaded a preview-only sample set; connect Gemini or OpenAI before publishing AI-generated content.') } catch (err) { alert(err.response?.data?.error || 'AI generation failed') } finally { setGenerating(false) } };
  if (mode === 'choice') return <div className="modal-backdrop open"><div className="creation-choice-modal"><div className="modal-header"><div><span className="eyebrow">ASSESSMENT BUILDER</span><h2>Create assessment</h2></div><button className="close" onClick={onClose}><X size={18} /></button></div><div className="creation-options"><button onClick={() => setMode('manual')}><div className="create-option-icon"><Pencil size={22} /></div><h3>Create manually</h3><p>Add a title, instructions, and questions yourself.</p><span>Start building <ChevronRight size={15} /></span></button><button onClick={() => setMode('ai')}><div className="create-option-icon ai"><BarChart3 size={22} /></div><h3>Generate with AI</h3><p>Describe your assessment and review generated questions.</p><span>Generate assessment <ChevronRight size={15} /></span></button></div></div></div>;
  if (mode === 'ai') return <div className="modal-backdrop open"><div className="assessment-modal ai-modal"><div className="modal-header"><div><span className="eyebrow">AI ASSESSMENT GENERATOR</span><h2>Generate assessment questions</h2></div><button className="close" onClick={onClose}><X size={18} /></button></div><div className="modal-body"><div className="form-grid"><label className="full">Assessment title or topic<input value={ai.title} onChange={e => setAi({ ...ai, title: e.target.value })} placeholder="e.g. HTML Fundamentals" /></label><label>Subject<select value={ai.subject} onChange={e => setAi({ ...ai, subject: e.target.value })}><option>Problem Solving</option><option>DBMS</option><option>Web Development</option><option>Data Structures</option></select></label><label>Difficulty<select value={ai.difficulty} onChange={e => setAi({ ...ai, difficulty: e.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Number of questions<input type="number" min="1" max="50" value={ai.count} onChange={e => setAi({ ...ai, count: e.target.value })} /></label><label>Question type<select value={ai.type} onChange={e => setAi({ ...ai, type: e.target.value })}><option>Mixed</option><option>MCQ</option><option>Multiple Select</option><option>Descriptive</option><option>Flowchart Output (MCQ)</option></select></label><label>Duration (minutes)<input type="number" min="1" value={ai.duration} onChange={e => setAi({ ...ai, duration: e.target.value })} /></label><label className="full">Assessment prompt<textarea rows="5" value={ai.prompt} onChange={e => setAi({ ...ai, prompt: e.target.value })} placeholder="Describe the exact assessment you want: topic, sections, question patterns, difficulty, practical tasks, MCQs, flowchart or HTML/CSS requirements, and number of marks..." /></label><label className="full">Assessment description<textarea rows="2" value={ai.description} onChange={e => setAi({ ...ai, description: e.target.value })} placeholder="Optional: short description shown with the assessment..." /></label><label className="full">Additional instructions<textarea rows="2" value={ai.instructions} onChange={e => setAi({ ...ai, instructions: e.target.value })} placeholder="Optional: additional generation rules or topics to avoid..." /></label></div></div><div className="modal-footer"><button className="secondary" onClick={() => setMode('choice')}>Back</button><button className="primary" disabled={generating} onClick={generate}>{generating ? 'Generating...' : 'Generate with AI'}</button></div></div></div>;
  return <div className="modal-backdrop open"><div className="assessment-modal"><div className="modal-header"><div><span className="eyebrow">ASSESSMENT BUILDER</span><h2>{form.id && assessment.title ? 'Edit assessment' : 'Create assessment'}</h2></div><button className="close" onClick={onClose}><X size={18} /></button></div><div className="modal-body"><div className="form-grid"><label>Assessment Title<input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Problem Solving — Phase 1" /></label><label>Subject<select value={form.subject} onChange={e => update('subject', e.target.value)}><option>Problem Solving</option><option>DBMS</option><option>Web Development</option><option>Data Structures</option><option>HTML</option><option>CSS</option><option>JavaScript</option></select></label><label>Phase<select value={form.phase} onChange={e => update('phase', e.target.value)}><option>Phase 1</option><option>Phase 2</option><option>Phase 3</option></select></label><label>Topic<input value={form.topic} onChange={e => update('topic', e.target.value)} placeholder="e.g. Flowcharts" /></label><label>Difficulty<select value={form.difficulty} onChange={e => update('difficulty', e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Duration (minutes)<input type="number" min="1" value={form.duration} onChange={e => update('duration', e.target.value)} /></label><label>Total Marks<input type="number" min="1" value={form.totalMarks} onChange={e => update('totalMarks', e.target.value)} /></label><label>Passing Marks<input type="number" min="0" value={form.passingMarks} onChange={e => update('passingMarks', e.target.value)} /></label><label>Start date & time<input type="datetime-local" value={form.startDate || ''} onChange={e => update('startDate', e.target.value)} /></label><label>End date & time<input type="datetime-local" value={form.endDate || ''} onChange={e => update('endDate', e.target.value)} /></label><label>Maximum attempts<input type="number" min="1" value={form.maxAttempts || '1'} onChange={e => update('maxAttempts', e.target.value)} /></label><label>Attempt policy<select value={form.oneAttemptPerEmail === false ? 'multiple' : 'one'} onChange={e => update('oneAttemptPerEmail', e.target.value === 'one')}><option value="one">One attempt per email</option><option value="multiple">Allow reopening/attempts</option></select></label><label className="full">Allowed student emails<textarea rows="3" value={(form.allowedEmails || []).join('\n')} onChange={e => update('allowedEmails', e.target.value.split(/[\n,;]/).map(v => v.trim()).filter(Boolean))} placeholder={"student1@example.com\nstudent2@example.com"} /><small>Leave empty to allow all students. Enter one email per line.</small></label><label className="full">Description<textarea rows="2" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe the assessment..." /></label><label className="full">Student Instructions<textarea rows="3" value={form.instructions || ''} onChange={e => update('instructions', e.target.value)} placeholder="Instructions students will see before starting..." /></label></div><div className="questions-head"><div><span className="eyebrow">QUESTIONS</span><h3>{form.questions.length} question{form.questions.length !== 1 ? 's' : ''}</h3></div><button className="secondary" onClick={addQuestion}><Plus size={15} />Add Question</button></div>{form.questions.map((q, i) => <div className="question-editor" key={i}><div className="question-number">{i + 1}</div><div className="question-fields"><label>Question text<textarea rows="2" value={q.text} onChange={e => questionChanged(i, 'text', e.target.value)} placeholder="Enter the question" /></label><div className="question-row"><label>Answer collection<select value={q.answerType || (q.type === 'Multiple Choice' || q.type === 'Multiple Select' ? q.type : q.type === 'File Upload' ? 'Choose File' : 'Paragraph')} onChange={e => questionChanged(i, 'answerType', e.target.value)}><option>Multiple Choice</option><option>Multiple Select</option><option>Paragraph</option><option>Choose File</option></select></label><label>Marks<input type="number" min="1" value={q.marks} onChange={e => questionChanged(i, 'marks', e.target.value)} /></label><label>Difficulty<select value={q.difficulty} onChange={e => questionChanged(i, 'difficulty', e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label></div>{(q.type === 'Multiple Choice' || q.type === 'Multiple Select') && <div className="mcq"><span>Options & correct answer</span>{q.options.map((o, j) => <div className="option-row" key={j}>{q.type === 'Multiple Select' ? <input type="checkbox" checked={(Array.isArray(q.correctAnswer) ? q.correctAnswer : []).includes(o) && !!o} onChange={() => { const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : []; questionChanged(i, 'correctAnswer', current.includes(o) ? current.filter(x => x !== o) : [...current, o]) }} /> : <input type="radio" name={`correct-${i}`} checked={q.correctAnswer === o && !!o} onChange={() => questionChanged(i, 'correctAnswer', o)} />}<input value={o} placeholder={`Option ${j + 1}`} onChange={e => { const opts = [...q.options]; opts[j] = e.target.value; if (q.correctAnswer === q.options[j]) questionChanged(i, 'correctAnswer', e.target.value); else { const qs = [...form.questions]; qs[i] = { ...q, options: opts }; update('questions', qs) } }} /></div>)}</div>}</div><div className="question-actions"><button className="regenerate-q" title="Regenerate question" onClick={() => regenerate(i)}>Regenerate</button><button className="remove-q" title="Remove question" onClick={() => removeQuestion(i)} disabled={form.questions.length === 1}><Trash2 size={16} /></button></div></div>)}</div><div className="modal-footer"><button className="secondary" onClick={onClose}>Cancel</button><button className="secondary" onClick={() => save('draft')}>Save as Draft</button><button className="primary" onClick={() => save('published')}><CheckCircle2 size={16} />Publish Assessment</button></div></div></div>
}
function evaluateSubmission(assessment, answers) { let score = 0, totalPossible = Number(assessment.totalMarks) || 0; const strengths = []; const improvements = []; const questionResults = assessment.questions.map((question, index) => { const answer = answers[index]; const marks = Number(question.marks) || 0; if (question.type === 'Multiple Choice') { const correct = String(answer || '').trim() === String(question.correctAnswer || '').trim(); if (correct) { score += marks; strengths.push(`Correctly answered: ${question.text}`) } else improvements.push(answer ? `Review concept: ${question.text}` : `Question missed: ${question.text}`); return { index, text: question.text, type: question.type, answer: answer || 'Not answered', correctAnswer: question.correctAnswer, earned: correct ? marks : 0, maxMarks: marks, correct }; } const blank = !String(answer || '').trim(); if (blank) improvements.push(`Add a complete answer to: ${question.text}`); else improvements.push(question.type === 'Coding / Problem Solving' ? `Review code logic and test edge cases for: ${question.text}` : `Improve explanation with clear steps and examples for: ${question.text}`); return { index, text: question.text, type: question.type, answer: answer || 'Not answered', earned: null, maxMarks: marks, correct: null }; }); if (!strengths.length) strengths.push('You attempted every available question area; use the feedback below for the next attempt'); const needsReview = assessment.questions.some(q => q.type !== 'Multiple Choice'); const passed = !needsReview && score >= Number(assessment.passingMarks || 0); return { score, totalPossible, passed, needsReview, status: needsReview ? 'Submitted — mentor review pending' : passed ? 'Passed' : 'Needs practice', strengths, improvements, questionResults }; }

function AttemptModal({ assessment, onClose, onSubmit }) { const [answers, setAnswers] = useState({}); return <div className="modal-backdrop open"><div className="attempt-modal"><div className="attempt-header"><button className="close" onClick={onClose}><ArrowLeft size={18} /></button><div><span className="eyebrow">{assessment.subject} • {assessment.phase}</span><h2>{assessment.title}</h2></div><span className="timer"><Clock3 size={16} />{assessment.duration}:00</span></div><div className="attempt-body">{assessment.questions.map((q, i) => { const ans = answers[i]; return <section className="answer-card" key={i}><div className="answer-head"><b>{i + 1}</b><span>{q.type}</span><em>{q.marks} marks</em></div><h3>{q.text}</h3>{q.type === 'Multiple Choice' ? <div className="radio-options">{q.options.map((o, j) => <label key={j}><input type="radio" name={`answer-${i}`} checked={ans === o} onChange={() => setAnswers({ ...answers, [i]: o })} /><span>{o}</span></label>)}</div> : <textarea rows={q.type === 'Long Answer' || q.type === 'Coding / Problem Solving' ? 5 : 3} placeholder="Type your answer here..." value={ans || ''} onChange={e => setAnswers({ ...answers, [i]: e.target.value })} />}</section> })}</div><div className="modal-footer"><button className="secondary" onClick={onClose}>Save & exit</button><button className="primary" onClick={() => onSubmit(answers)}><Send size={16} />Submit Assessment</button></div></div></div> }
