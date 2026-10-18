import {EXTRA_BACKSTORIES} from './backstoryExpansion.js';
import {EASTER_EGG_BACKSTORIES} from './backstoryEasterEggs.js';

// Original fictional vignettes. Rules are applied to the finished player, never
// to a recruiting label, intended preset average, or an assumed depth-chart role.
const block=(id,rule,text)=>({id,rule,stories:text.trim().split('\n').map(line=>{const [title,...body]=line.split('|');return {title,text:body.join('|')};})});
export const BACKSTORY_GROUPS=Object.freeze([
block('family','any',`
Saturday Kitchen|His family always argued about football around the kitchen table. He still calls home after practice, ready to defend whichever play caught his attention that day.
The Old Ball|He keeps a worn football from childhood at home rather than replacing it. It reminds him of evenings when a patch of grass and a willing receiver were enough.
Grandfather's Radio|His grandfather followed games on a small radio while working in the garage. Hearing a broadcast still brings back the sound of tools and their running commentary.
The Long Drive|Family members took turns driving him to youth practices when their schedules rarely lined up. He remembers those rides as clearly as any game from that period.
Backyard Boundaries|His first field had a fence for one sideline and a driveway for the other. The arguments over catches taught him that football could be serious without a scoreboard.
Older Cousins|He learned the game by tagging along with older cousins. Getting included mattered more than winning, although he rarely admitted that at the time.
A Seat at Home|His family has a regular spot for watching games together. He likes knowing the same familiar faces will be there, whether he is nearby or calling from campus.
The Handwritten Note|A family member slipped a short encouragement note into his bag before he left for college. He has kept it through every round of unpacking.
Sibling Rivalry|An ongoing competition with a sibling turns even simple backyard drills into contests. They still keep a running argument about which one had the better hands as kids.
Sunday Call|He sets aside time for a family call each Sunday. Football usually comes up, but he likes hearing the ordinary news that makes campus feel a little closer to home.
`),
block('community','any',`
The Corner Store|The owner of his neighborhood store used to ask about every youth game. He still stops in when he is home, knowing the conversation will start in exactly the same place.
Park Lights|He first learned to love football beneath the lights of a public park. Even now, an empty field at dusk can make him want to grab a ball.
The Equipment Room|A local volunteer once helped him find gear that fit before a season began. He remembers how much a practical kindness can mean to a kid trying to play.
Youth League Reunion|Several friends from his first youth team still trade messages about football. Their conversations include far more old jokes than serious scouting advice.
Town Barber|His hometown barber has an opinion about every team and never charges extra for sharing it. He enjoys the routine, even when his own football choices become the debate.
The Local Field|He returns to the field where his youth team practiced whenever he can. The place seems smaller now, but the memories have not shrunk with it.
Coach's Whistle|A youth coach's whistle was the signal that everyone in his neighborhood knew. He still associates that sound with finishing homework quickly enough to make practice.
Little League Helper|He enjoys helping younger kids learn the basics when he is back home. Explaining a simple drill reminds him how much patience someone once showed him.
Friday Night Route|He can describe the route to his old high school field without thinking about a single turn. Taking it again brings back the small routines that made game nights special.
A Familiar Fence|Neighbors used to watch pickup games from behind the same fence. He likes the idea that a game does not need a big crowd to matter to the people playing it.
`),
block('interests','any',`
Playlist Curator|He treats a pre-practice playlist like a project with room for endless revisions. Teammates know that asking for one song recommendation may lead to an entire album discussion.
Kitchen Experiments|He likes trying recipes that look easy until the cooking starts. A few dependable meals have survived the experiments, along with plenty of stories about the failures.
Fishing Mornings|He enjoys the quiet of an early fishing trip when his schedule allows it. Waiting for a bite is a welcome change from a day measured in whistles and deadlines.
Camera Roll|He takes pictures of ordinary campus scenes rather than only big occasions. Looking through them gives him a record of college life beyond football.
Board Game Night|He is usually willing to join a board game if someone explains the rules. The easygoing invitation tends to become less easygoing once the score gets close.
Sneaker Notebook|He keeps track of shoe designs he likes, including pairs he has no plans to buy. Comparing small details has become a relaxing hobby rather than a shopping mission.
The Long Walk|He likes taking an unhurried walk after a crowded day. It gives him a chance to think about something that is not the next item on a schedule.
Sketchbook|He occasionally sketches ideas in the margins of a notebook. Most never become finished drawings, but he enjoys having something to work on without a score attached.
Movie Debates|He has strong opinions about which sports movies hold up on a second viewing. Friends have learned that asking for his favorite is easier than asking him to rank them.
Weekend Grill|He enjoys the social side of a cookout as much as the food. Offering to help at the grill is his usual way of avoiding an awkward introduction.
`),
block('routines','any',`
Bag Check|He checks his practice bag in the same order before leaving. It is a small routine that makes a busy morning feel less scattered.
The Spare Pen|He carries a spare pen because someone always seems to need one. The habit began in school and followed him into meeting rooms.
Early Bus Habit|Catching an early school bus taught him to get ready before the last possible minute. He still prefers a little waiting time to a rushed arrival.
One Clear Goal|He writes down one manageable goal before a practice week. Crossing it off matters more to him than making a long list he cannot remember.
Post-Practice Reset|He takes a few minutes to put his things in order after practice. A tidy locker is one part of the day he can control without needing a coach's permission.
Question in the Margin|He marks questions in the margin instead of trying to remember them later. Bringing one clear question to a meeting feels more useful than pretending everything made sense.
Travel Window|He likes watching the scenery on bus rides. The quiet stretch between departure and arrival gives him a break from the usual campus pace.
The Calendar|He keeps a plain calendar rather than relying on memory. Seeing the week in one place helps him make room for responsibilities outside football.
Shoelace Ritual|He reties his shoes if the first attempt does not feel right. He knows it is a habit rather than a competitive advantage, but it is one he has no interest in changing.
One More Look|He makes one final check for forgotten equipment before leaving a room. Friends may tease him about it, but they also ask whether he has seen their missing things.
`),
block('arrival','true-freshman',`
New Campus Map|He arrived with a campus map saved on his phone and more confidence than sense of direction. Learning the route from class to practice is part of his first college adjustment.
First College Notebook|He began his first college notebook with a carefully organized index. The pages are filling quickly as he learns how much information can fit into one football meeting.
The Move-In Box|The last box he unpacked contained reminders of home rather than football gear. Keeping those things nearby has made his first college room feel less temporary.
New Vocabulary|He is learning that familiar football ideas can have unfamiliar names in a new system. Asking questions is becoming a regular part of his first season on campus.
Finding a Routine|He is working out how to balance college classes, meals and practice for the first time. A predictable daily routine is starting to matter more than the excitement of move-in day.
The First Team Meeting|He spent his first college team meeting trying to learn faces as well as terminology. There is plenty to absorb before any of it begins to feel ordinary.
High School Keepsake|He brought one small keepsake from his high school team to campus. It is a reminder of where he started rather than a claim about what comes next.
Learning the Pace|The pace of a college practice is still new to him. He is concentrating on understanding the next instruction instead of getting overwhelmed by the whole afternoon.
Home on the Phone|His first stretch away at college has made short calls home part of the routine. He has discovered that describing an ordinary day can be more reassuring than trying to sound impressive.
First Fall Checklist|He made a checklist for his first college fall and keeps finding things to add. Football is a big part of it, but learning how to live on campus takes work too.
`),
block('redshirt-freshman','rs-freshman',`
Second First Impression|He has already spent a redshirt year learning what college football asks of him. Being a freshman on the roster no longer means that every part of campus life is new.
The Practice Notebook|His redshirt year left him with a notebook full of reminders. He is looking for ways to turn those notes into better habits rather than simply collecting more pages.
More Familiar Hallways|A redshirt season gave him time to stop feeling lost between classes and meetings. He enters this year with fewer everyday distractions and a clearer idea of the routine.
The Year of Questions|He used his redshirt year to ask the questions he had been afraid would sound obvious. The answers gave him a more useful starting point for the work ahead.
Patient Beginning|His college start included a redshirt season rather than a quick rush into expectations. He is trying to treat that extra time as preparation, not a guarantee of what comes next.
Watching the Details|A year in the program taught him to notice how older teammates prepare. He is borrowing the routines that suit him without trying to copy someone else's whole personality.
Familiar Terminology|The language of the playbook is less intimidating after a redshirt year. He can spend more attention on the instruction itself instead of decoding every phrase.
Beyond Move-In Day|He has already been through the awkward first year of finding his way around campus. Now he wants his daily football work to feel just as settled.
Redshirt Reflection|He looks back on his redshirt season as a year of small lessons rather than one defining moment. Keeping track of those lessons helps him see the time as useful.
The Next Chapter|His redshirt year is behind him, even though his listed class still says freshman. He knows the next step will depend on what he does now, not merely on having waited.
`),
block('early-years','young',`
Learning to Ask|He is early enough in his college career to encounter something unfamiliar almost every week. He would rather ask a useful question than hide a misunderstanding.
Building a Foundation|He is concentrating on habits that will last beyond a single practice. There is still plenty of college football ahead of him, and he wants a dependable starting point.
The Younger Voice|He sometimes listens before speaking in a room full of older players. When he does ask a question, it is usually one he has thought about for a while.
Small Milestones|He keeps track of little milestones as he settles into college football. A clearer assignment or a better-organized week can matter even without anyone else noticing.
Finding His People|He is still building the friendships that make a team feel like a familiar place. Shared meals have been as useful for that as conversations about the playbook.
Learning the Week|He is getting used to how much preparation happens before a college football weekend. Understanding the rhythm of the week has become a goal of its own.
More Than One Lesson|He is discovering that a difficult practice can teach several things at once. Sorting out those lessons is part of learning to handle college football without taking every setback personally.
A Borrowed Routine|He borrowed part of an older teammate's preparation routine and adapted it. Finding a version he can repeat matters more than making it look elaborate.
Room to Settle|He is giving himself time to become comfortable with the demands of college life. That patience does not stop him from wanting a better practice the next day.
The Next Useful Step|He prefers thinking about the next useful step rather than his whole college career at once. It keeps a long list of possibilities from becoming a distraction.
`),
block('veterans','veteran',`
The Familiar Routine|By this point in college, the weekly routine feels familiar to him. He still looks for small adjustments instead of assuming familiarity means there is nothing left to learn.
Perspective in the Room|Having reached the upper classes gives him a longer view of everyday setbacks. A rough afternoon no longer has to become a verdict on an entire season.
Knowing the Questions|He has learned which questions are worth asking before a meeting ends. That experience helps him make better use of the time everyone spends preparing.
Campus Landmarks|He can point out the quiet study spots and reliable meal stops that younger players are still finding. Those ordinary recommendations are one way he stays connected to teammates.
The Short Memory|He has had enough college routines to know that dwelling on one mistake rarely fixes it. He tries to carry the lesson forward without carrying every frustration with it.
An Older Perspective|He notices how quickly a college year can pass now. The thought makes him more deliberate about the everyday moments he once hurried through.
The Meeting Seat|He has a favorite place to sit in meetings, though he will not admit it is a preference. Small familiarities help a crowded football week feel organized.
Useful Advice|When younger teammates ask about college life, he tries to give practical answers. Knowing where to go and what to bring can help more than a speech.
The Routine Refined|He has changed his preparation habits as he has gotten older. What remains is a simpler routine he can actually repeat on a busy week.
Taking Stock|He has reached the point in college where looking back can be useful. He is trying to separate the habits worth keeping from the ones he merely got used to.
`),
block('last-ride','rs-senior',`
One Last Fall|He is entering his final college season as a redshirt senior. The familiar routines carry a little more weight when he knows there will not be another fall quite like this one.
The Last First Meeting|The first team meeting of the year has become his last as a college player. He is trying to appreciate the moment without letting it distract from the work that follows.
Keeping the Small Things|As a redshirt senior, he is noticing the ordinary parts of college football he will miss. The walk to practice can mean as much as the events people photograph.
Final-Year Focus|His redshirt-senior season gives him a clear endpoint to work toward. He wants to leave knowing he took the daily preparation seriously.
The Closing Chapter|He is approaching the end of his college eligibility. Rather than trying to script a perfect ending, he is concentrating on being present for the season he has.
The Last Equipment Check|An equipment check feels different with a final season ahead. He is aware that even the unremarkable routines are becoming things he will remember.
Passing Along the Routine|He is a redshirt senior with practical lessons younger players can use. Sharing a few of them feels like a worthwhile part of his final year.
The Final Calendar|He can see the outline of his last college football season on the calendar. It is a reminder to make room for the people as well as the preparation.
No Extra Fall|His redshirt has already been used, and this is his senior year. Knowing there is no spare college season has made him more intentional about his time.
Leaving Something Useful|He wants his final college season to leave something useful behind. That could be as simple as helping a younger teammate avoid a mistake he understands now.
`),
block('redshirt','redshirted',`
Time to Observe|Using a redshirt gave him time to observe how a college program works. He still values the lessons that came from paying attention when he was not the center of it.
The Extra Perspective|A redshirt year changed how he thought about a football timeline. Progress did not have to look the same as everyone else's to be worth pursuing.
An Unhurried Lesson|His college path included a redshirt rather than an uninterrupted climb through the class years. He learned to find useful work in a season that required patience.
The Waiting-Year Notebook|He kept notes during his redshirt year that still turn up in his bag. Some are reminders about football, while others explain how he learned to handle the routine.
Different Timetables|Having used a redshirt helped him understand why teammates can share a class label but have different experiences. He is less interested now in comparing everyone's clock.
The Long View|A redshirt season taught him that a college career is not built on one autumn. He tries to apply that perspective whenever the daily work feels repetitive.
Watching Preparation|He paid close attention to preparation during the year he redshirted. What stayed with him was how much of the job happens away from a crowd.
The Patient Route|His listed class comes with a redshirt year already behind it. He sees that part of the path as experience rather than something he needs to explain away.
Notes from the Sideline|His redshirt year gave him reasons to listen carefully during practice. He still returns to a few simple reminders from that time when things begin to feel complicated.
A Different Start|His college progression includes a redshirt year. It left him with an appreciation for the less visible parts of being on a team.
`),
block('developmental','low-overall',`
One Assignment at a Time|He is still developing the tools needed to handle college football consistently. Focusing on one assignment at a time gives him a more useful goal than pretending the whole gap will close overnight.
The Long Project|His current game remains a work in progress. He is trying to measure useful habits rather than demand a dramatic transformation after every practice.
Earning the Next Rep|He knows his current ability leaves plenty to work on. The next well-executed repetition is a more realistic target than a promise about future stardom.
Starting with the Basics|He has more to gain from getting the basics right than from chasing a highlight. That makes ordinary instruction a central part of his football week.
No Shortcut Story|There is no quick-fix story attached to his current football development. He is concentrating on the parts of the job he can repeat, even when the results are modest.
A Manageable Checklist|He has broken the work ahead into a manageable checklist. It is easier to address one weakness than to turn every practice into a judgment about his future.
The Patient Rep|His game is not yet polished enough to make difficult things look routine. He is willing to repeat simple work rather than skip ahead for appearances.
Keeping the Goal Small|He is not treating his current level as proof of a breakthrough waiting around the corner. A clear assignment and a better habit are enough to work toward today.
Learning without the Hype|He is developing without the ready-made expectations attached to a finished player. There is room to work without needing every session to produce a new success story.
The Next Correction|He has plenty of corrections available before the finer details become the priority. Taking the next one seriously is how he keeps the job from feeling too large.
`),
block('polished','high-overall',`
Tools Already in Place|His current ability gives him a strong foundation for demanding work. He is concentrating on preparation rather than treating those tools as a guarantee of results.
The Higher Standard|He has the ability to be held to a high standard. The challenge is making his ordinary preparation match the level of work he is capable of producing.
Details at the Top|His game has reached a level where small details deserve serious attention. He knows that strong ability does not make an assignment disappear.
Beyond the Easy Rep|He has enough ability that comfortable practice work is not the whole challenge. He is looking for ways to make the preparation useful when the task becomes more demanding.
Keeping an Edge|His present skill gives him good reason to be confident. He is trying to keep that confidence from becoming an excuse to coast through the routine.
The Demanding Checklist|He can handle a demanding football checklist because many of the basic tools are already there. Following it consistently is still a separate job.
Ready for Hard Questions|His current ability allows coaches to ask difficult things of him. He prefers understanding the reason behind an assignment to relying on talent alone.
Strong Starting Point|He has a strong present-day football profile. What he does with that starting point still depends on decisions, preparation and the opportunities that come.
The Useful Challenge|He is capable enough that an easy afternoon is not always the most useful one. He wants practice to test something rather than simply confirm what already feels comfortable.
Ability Is Not the Plan|He brings considerable current ability to his position. He still needs a plan for using it, just like everyone else in the meeting room.
`),
block('upside','high-potential',`
The Unfinished Picture|His development outlook gives him room to think beyond the player he is today. He is trying to turn that possibility into useful work without mistaking it for a finished result.
Patience with Purpose|There is meaningful upside in his football profile. He wants his preparation to give that upside a chance rather than leave it as a flattering description.
The Next Version|He likes the idea that his best football may not be the version people see right now. The thought is motivation, not a promise about where he will end up.
Potential Is a Starting Point|His developmental outlook is encouraging. He knows that having room to improve is different from doing the work needed to use it.
More to Build|There is still considerable opportunity to develop his game. He is focusing on specific habits instead of trying to improve everything at once.
The Longer Plan|His profile gives him reasons to take a longer view of development. That perspective helps him see ordinary practice as part of something worth building.
Possibility and Preparation|He has a promising development outlook rather than a guarantee. Keeping those ideas separate is part of how he approaches the work ahead.
The Open Notebook|His future development offers more possibilities than a snapshot of current ability can show. He wants to keep learning without inventing a destination before the work is done.
Growing into the Job|He has room to develop further within his football role. He is concentrating on becoming more complete rather than finding a shortcut to a reputation.
The Patient Ceiling|His potential gives him something worthwhile to pursue over time. He does not expect every practice to reveal the whole picture at once.
`),
block('limited-upside','limited-potential',`
Making the Most of It|He is not banking on a dramatic jump in his physical tools. His focus is making better use of what he already brings to the job.
The Practical Plan|A summer job stocking shelves taught him to take pride in work that nobody stopped to watch. He brings the same practical attitude to football, even without expecting a dramatic personal breakthrough.
Value in the Routine|He helped maintain a community field before youth games when he was growing up. Straightening markers and carrying water gave him an early appreciation for the useful jobs people rarely mention.
Working with the Tools|He approaches football as a job to do with the tools he has. His goals are deliberately grounded in the player he is now.
No Miracle Required|A former coach mailed him an old practice schedule with one handwritten reminder: do the ordinary work. He kept it because the message fits how he approaches football now.
The Honest Assessment|He once asked a family friend for a brutally honest review of his football film. He did not enjoy every answer, but he appreciated leaving with a practical list instead of a sales pitch.
Useful before Flashy|He is aiming to be useful before trying to be impressive. It is a sensible approach for a player whose development path is not built around limitless upside.
The Small Improvement|His father kept a notebook of repairs that made an aging car last another year. He borrowed the habit for football, writing down small fixes instead of waiting for one change to solve everything.
What Can Be Repeated|He is placing his attention on habits he can repeat with his current tools. A realistic plan feels more valuable than a big promise about his ceiling.
Staying Grounded|He is keeping his expectations grounded in a limited development outlook. That leaves room to take everyday football work seriously without demanding a storybook transformation.
`),
block('speed','fast',`
Track-Lane Memory|His speed and acceleration give him an obvious athletic tool. He still remembers the simple thrill of racing friends to a line drawn in the grass.
The Head Start Argument|Friends used to negotiate head starts before racing him. His current burst explains why those arguments were rarely settled to everyone's satisfaction.
Fast Is Not Finished|He has genuine speed to work with. He is trying to make sure getting somewhere quickly does not replace understanding where he is supposed to be.
The Sprint Home|As a kid, he found excuses to turn ordinary walks into races. That instinct fits a player who now brings notable speed and acceleration to football.
Learning to Use the Burst|His ability to accelerate is one of the clearer tools in his game. He is thinking about when to use it rather than assuming the fastest movement is always the right movement.
The Open Stretch|He enjoys the feeling of having room to run. His speed gives that feeling a practical football use, although every assignment still needs its own plan.
The Finish-Line Habit|He has always liked running through the finish rather than easing up before it. His current speed makes that a natural part of his athletic identity.
Speed with a Purpose|He brings enough speed and acceleration to make movement a meaningful part of his game. He wants those tools to serve the assignment instead of becoming a distraction from it.
The Quick First Steps|His first few steps are backed by real acceleration. He is trying to connect that burst with the rest of the job rather than treat it as the whole job.
Races at Recess|He remembers races at recess more clearly than most playground games. His current speed suggests those contests gave him a reason to keep coming back.
`),
block('strength','strong',`
Moving Day Volunteer|His strength makes him a popular person to call when furniture needs moving. He still insists that awkward stairs are a different opponent from anything on a field.
The Heavy End|When a job requires two people to lift something, friends tend to hand him the heavy end. His current strength makes the arrangement understandable, even if he complains about the planning.
Strength Is a Tool|He brings substantial strength to his football work. He is learning that applying it well matters more than merely having it available.
The Stubborn Lid|Family members have turned opening stubborn jars into a running joke about his strength. He likes reminding them that it is not an official household position.
Weight Room Patience|His strength is a clear part of his current athletic profile. He still treats preparation as something that needs patience rather than one dramatic effort.
The Physical Starting Point|He has a strong physical tool to build around. He is concentrating on connecting it to the details of his position.
More than Force|His strength gives him a useful option when a task becomes physical. He knows that timing and direction decide whether that force actually helps.
The Careful Lift|He is strong enough that people sometimes assume lifting is the easy part. He has learned to be just as interested in where his hands and feet belong.
Family Workdays|He was often the volunteer for the heavier jobs during family workdays. His current strength makes that memory fit the football player he has become.
Using the Leverage|He has plenty of strength available. Getting it into the right place at the right moment remains a separate skill to practice.
`),
block('technical','technical',`
The Footwork Notebook|He pays particular attention to the small steps that make a football movement work. His technical profile fits an approach built around refining the job rather than chasing athletic extremes.
The Quiet Repetition|He prefers repeating a precise movement to making a drill look dramatic. His game leans toward positional craft, so those quiet repetitions suit his priorities.
One Detail at a Time|He likes instructions that identify one detail he can change. A technique-focused game gives him plenty of reason to value that clarity.
The Why Question|He wants to know why a particular hand placement or angle matters. Understanding the reason helps him organize the technical side of his game.
Practice in Pieces|He breaks a complicated action into smaller pieces when working through it. That habit fits a profile that emphasizes positional skill over raw athletic emphasis.
The Craft Approach|He enjoys the part of football that rewards careful attention. His technical lean gives him a reason to treat familiar drills as opportunities rather than formalities.
Film and Footwork|He is interested in how a small footwork change looks when a play is slowed down. His approach centers on making the positional details fit together.
The Precise Rep|He would rather complete a precise rep than an impressive-looking one with a missing detail. That preference matches the technical direction of his game.
The Small Adjustment|He pays attention when a coach asks for an adjustment that seems minor. His profile places value on the positional details those changes are meant to address.
Knowing the Shape|He likes understanding the shape of an assignment before trying to speed it up. Positional craft, rather than an extreme athletic identity, is the emphasis in his game.
`),
block('small','small-build',`
Finding the Right Fit|He has a smaller frame than many players at his position. Finding equipment that sits correctly has been part of his football routine for years.
The Size Question|Questions about his smaller build have followed him into football conversations. He would rather spend that energy understanding the job in front of him.
Measured by the Task|He is shorter and lighter than many of his positional peers. He wants the task itself, not a first impression of his frame, to guide how he prepares.
The Smaller Locker Kit|His equipment needs do not always match what is handed out first. A smaller build has made him comfortable asking for the fit he actually needs.
Looking Past the Frame|His frame puts him toward the smaller end of his position. He does not treat that fact as a complete scouting report.
The Fit Check|He remembers an equipment volunteer digging through several boxes to find youth gear that fit him. His comparatively small frame still makes a careful fitting more useful than simply taking the first size offered.
His Own Outline|He does not have the frame people often picture first at his position. He is trying to work with his own build rather than imitate someone else's silhouette.
The Undersized Introduction|His smaller size tends to become part of the introduction before anyone discusses football. He would prefer a conversation that lasts long enough to reach the actual assignment.
The Right Size|He has learned that making equipment fit is better than pretending a larger size will do. His smaller frame calls for practical adjustments, not a different identity.
Beyond the Tape Measure|He falls on the smaller side of the position's physical range. That gives him something to account for, not a reason to stop learning the rest of the job.
`),
block('large','large-build',`
The Back-Row Photograph|He has a stack of school photographs in which he is standing in the back row. His larger frame has made the family joke about him blocking the camera a lasting one.
Finding Enough Legroom|He notices legroom before settling into a long trip. Being taller and heavier than many positional peers makes travel comfort a practical concern.
The Larger Gear Bag|His equipment can make a packed bag look fuller than someone else's. A comparatively large frame has a way of showing up in ordinary details.
The Doorway Check|He has a habit of looking ahead when entering a cramped room. His larger build gives him reasons to think about space before everyone else does.
Size and the Assignment|His frame stands out among players at the same position. He is concentrating on how to use that size rather than assuming it handles the job for him.
The Seat Negotiation|Friends know that a seating plan involving him may require a little negotiation. His size is noticeable well beyond a football meeting room.
The Long Sleeves|Finding everyday clothes with the right fit can take more effort than he would like. His larger frame has made him patient with trying things on.
More than an Outline|His size is an obvious part of a first impression. He still wants to understand the football details that a large frame cannot answer by itself.
The Bigger Frame|He carries a larger frame than many players doing the same job. Learning to manage the space around him is part of his everyday routine.
The Practical Measurement|He has learned to check measurements before ordering almost anything he wears. Being at the larger end of his position makes guessing a poor substitute for checking.
`),
block('quarterbacks','qb',`
The Backyard Playbook|He used to draw passing plays on the backs of grocery receipts for neighborhood games. His family still has a few, including one formation that involved throwing over a parked car.
Calling the Huddle|He remembers being the kid who volunteered to organize a pickup huddle. He now has a quarterback's reason to make the words clear before everyone starts moving.
The Coverage Sketch|He sketches defensive looks while working through quarterback material. Putting them on paper helps him sort the question before deciding on an answer.
A Receiver's Perspective|He likes asking receivers how a route feels from their side of the throw. As a quarterback, he wants the conversation to run in both directions.
The Snap Conversation|He makes a point of discussing the exchange with the players involved. Quarterback preparation includes a few details that never appear in a passing highlight.
The Call Sheet Interest|He is interested in how a group of plays becomes a plan. His position gives him plenty of reasons to ask about the choices behind a call sheet.
The Throwing Partner|An older neighbor was his regular throwing partner when his parents worked late. They still exchange messages, although the neighbor now insists that every good throw began with his advice.
Learning the Language|He likes comparing the different names people give familiar passing concepts. Playing quarterback has made that collection of terms more than a casual interest.
The Reset between Plays|He thinks about what he wants the huddle to hear after a difficult rep. For a quarterback, the next instruction needs to be clearer than the last frustration.
The Ball at the Start|He is drawn to the way a play begins with so many possible directions. Quarterback is the position where he gets to work through that question most directly.
`),
block('offensive-skill','offensive-skill',`
The Extra Catch|He rarely objects when someone needs a partner to toss a ball. Playing an offensive skill position gives those casual repetitions a familiar purpose.
The Route Conversation|He likes talking through how a route or run should develop before it starts. Understanding the space is part of what interests him about his offensive role.
The Ball-Carry Habit|His grandmother refused to let him carry a football into the kitchen after one broken lamp. He still catches himself tucking anything football-shaped against his side, including a loaf of bread.
The Sideline Marker|He pays attention to the difference between open space and usable space. On offense, a boundary can turn a simple idea into a very specific job.
Practice after the Catch|He enjoys working through what happens after the ball arrives. An offensive skill role includes more than reaching the first point on a diagram.
The Blocking Reminder|He does not want the ball to be the only part of his offensive identity. He asks about the assignments that still matter when a teammate gets the touch.
The Timing Question|He is interested in the timing that lets several offensive movements fit together. He would rather understand his part than merely memorize where to stand.
The Return Pass|His younger brother used to make him run routes until the streetlights came on. The routes were rarely drawn properly, but neither of them ever wanted to be the first to go inside.
The Open-Grass Diagram|He likes diagrams that explain where space is supposed to appear. His offensive role gives him reasons to connect those drawings with what a defender actually does.
The Work without the Touch|He is learning to judge an offensive rep by more than whether the ball reaches him. A useful assignment can happen well away from the eventual tackle.
`),
block('offensive-line','ol',`
The Five-Person Job|He likes the idea that an offensive line has to solve a problem together. Understanding the neighboring assignment is part of how he approaches his own.
Hands before Headlines|He pays attention to hand placement during ordinary line work. Offensive line gives him a position where small details can matter without drawing much attention.
The Protection Conversation|He is interested in how a protection call connects several players. He wants to understand the conversation rather than only the word directed at him.
The Line-Room Seat|His high school line used to claim the same lunch table every day, even outside football season. He misses the arguments over the last seat more than he admits.
The First Step Study|He tried wrestling after a high school coach suggested it might help him understand balance. He came away with more respect for footwork and a strong dislike of early tournament weigh-ins.
The Neighboring Helmet|His first offensive line coach paired every new player with an older teammate. He still remembers the patience of the lineman who explained the same assignment three different ways.
The Unseen Part|He is interested in football work that often disappears behind the ball. Playing on the offensive line gives him plenty of that work to think about.
The Stance Routine|He approaches his stance as something worth checking rather than assuming. Line play gives him a reason to repeat a familiar setup with care.
The Shared Answer|He likes working through a blocking question with another lineman. Hearing a second explanation can show him where his own picture is incomplete.
The Finish of a Rep|He pays attention to how a blocking rep ends as well as how it starts. The offensive line has taught him that the first contact is not the whole assignment.
`),
block('defensive-line','dl',`
The Point of Contact|He is interested in what happens where an offensive play first meets resistance. His defensive line role keeps that question close to the center of practice.
The Rush Plan Notebook|He writes down reminders about the sequence of a rush. A plan for the line of scrimmage seems more useful than a collection of unrelated moves.
The Gap Question|He asks how his gap responsibility fits the defender beside him. Playing on the defensive front means someone else's movement can change the picture quickly.
Watching the Hands|He notices hand placement when studying line-of-scrimmage work. Defensive line gives him plenty of reasons to care about details that can vanish at full speed.
The Stance across from Him|A friend from his youth team became an offensive lineman, turning their backyard arguments into football debates. They still send each other clips, each convinced the other has the easier job.
The Rush and the Run|He does not want to think about his job only as a chase toward the quarterback. Defensive front work also asks him to understand what happens when the ball goes elsewhere.
The Small-Space Job|As a kid, he helped an uncle repair engines in a garage with barely enough room to move. He jokes that working in crowded spaces prepared him for life near the line of scrimmage.
The Second Move|He likes talking through what comes after the first contact. A defensive line rep can become a different problem before the initial idea has finished.
The Front's Conversation|He wants to know what the rest of the defensive front is expecting. The job makes more sense to him as a shared picture than a series of isolated collisions.
The Pursuit Finish|His youth coach ended every practice by letting the defensive linemen carry the ball. He still remembers those chaotic races whenever someone claims the players up front never get to have fun.
`),
block('back-seven','back-seven',`
The Leverage Question|He asks about leverage before worrying about how a defensive rep looks. His role behind the front gives him a reason to care where help is supposed to be.
The Communicated Check|He likes repeating a defensive check until the words are easy to understand. A clear message matters even when it is not the most exciting part of the play.
The Route from the Other Side|His best childhood friend always insisted on playing receiver in their one-on-one games. They disagree about who won more often, but those afternoons helped make defense his favorite side of the ball.
The Angle in the Diagram|He pays attention to the path that leads toward a tackle, not only the finish. Playing behind the front makes angles part of his everyday football vocabulary.
The Motion Reminder|He watches how an offense changes the picture before the snap. His job gives him plenty of reasons to ask what stays the same when the formation moves.
The Help behind the Call|He likes understanding where the next defender fits into a coverage. Knowing his own responsibility is only one part of seeing the whole arrangement.
The Open-Field Question|He spent childhood summers playing center field on a neighborhood baseball team. He did not stick with baseball, but he remembers enjoying the feeling of having a whole patch of grass to look after.
The Coverage Conversation|His family used to pause televised games so everyone could argue about what the defense should do. He now understands why his guesses from the couch were easier than the real assignments.
Eyes and the Assignment|He thinks about what he should be looking at before a play develops. His defensive role makes the answer more useful than simply trying to watch everything.
The Pursuit Landmark|He likes having a landmark when discussing pursuit. A specific place on the field is easier for him to work toward than a vague instruction to get involved.
`),
block('specialists','specialist',`
The Repeatable Setup|He is interested in making his setup look familiar from one attempt to the next. Specialist work gives a small routine a large place in the practice day.
Weather Notebook|He began checking the wind on walks to school after getting interested in kicking a football. His family still asks him for a weather report whenever they plan an outdoor meal.
The Quiet Corner|He used to take a football to an empty park while friends played on the nearby courts. Having a quiet place to practice became part of why he enjoyed being a specialist.
The Contact Point|He pays attention to the point where his foot meets the ball. It is a small detail that his specialist role gives him reasons to revisit often.
The Waiting Part|He is interested in staying ready during the stretches between attempts. Specialist work includes managing that time as well as the action everyone notices.
A Familiar Spot|He likes beginning practice from a familiar spot before changing the task. The routine gives his specialist work a clear starting point.
The Ball Conversation|An old soccer ball was his first piece of sports equipment, long before he tried kicking a football. He keeps it at home as a reminder of afternoons spent inventing targets along the fence.
The Small Correction|He prefers a clear, small correction to changing everything after one attempt. That approach suits work built around a repeatable specialist motion.
The Long Pause|He first learned to enjoy repetitive practice by hitting tennis balls against a garage wall. The sport changed, but he still likes having one small task he can set up and try again.
The Reset Routine|He has a simple routine for starting again after an attempt. He wants the next setup to be about the next task, not the result that just happened.
`)
]);
export const BACKSTORIES=Object.freeze([...BACKSTORY_GROUPS.flatMap(group=>group.stories.map((story,index)=>Object.freeze({id:`${group.id}-${String(index+1).padStart(2,'0')}`,rule:group.rule,...story}))),...EXTRA_BACKSTORIES,...EASTER_EGG_BACKSTORIES]);
