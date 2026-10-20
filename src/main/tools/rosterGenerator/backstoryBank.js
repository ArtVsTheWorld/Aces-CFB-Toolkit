import {EXTRA_BACKSTORIES} from './backstoryExpansion.js';
import {EASTER_EGG_BACKSTORIES} from './backstoryEasterEggs.js';

// Original fictional vignettes. Rules are applied to the finished player, never
// to a recruiting label, intended preset average, or an assumed depth-chart role.
const block=(id,rule,text)=>({id,rule,stories:text.trim().split('\n').map(line=>{const [title,...body]=line.split('|');return {title,text:body.join('|')};})});
export const BACKSTORY_GROUPS=Object.freeze([
block('family','any',`
Kitchen Arguments|His mother can identify a blown assignment but still calls every penalty offside. He argues with her anyway, usually while she is packing leftovers for his trip back.
The Old Ball|His childhood football has a bite mark from a neighbor's dog and absolutely no grip left. He refuses to let his family throw it out, despite owning far better ones.
Grandfather's Radio|His grandfather used to turn down the television and call games himself. He still phones with unsolicited commentary, including when his grandson only called to ask about dinner.
The Long Drive|His aunt drove him to youth practices in a car with one working speaker. He still associates defensive drills with the same scratched country CD.
Backyard Boundaries|His brothers ruled that catches against the garage door counted as touchdowns. Their father abolished the rule after the second broken window, but the record book remains disputed.
Older Cousins|His cousins made him play center in backyard games because he was the youngest. He now refuses to start family games until somebody else volunteers to snap.
The Living-Room Scout|His dad critiques his football stance while watching television from a recliner. He recently sent back a photograph of that recliner labeled questionable lower-body technique.
The Handwritten Note|His sister hid a note in his football bag telling him not to become unbearable. He keeps it in his locker and claims she meant somebody else.
Sibling Rivalry|He and his brother still count backyard touchdowns dating back to elementary school. Neither trusts the other's total, and their mother refuses to officiate another appeal.
Sunday Call|He calls home after the team schedule clears and usually reaches a family argument already in progress. He likes being asked about broken appliances instead of his football future.
`),
block('community','any',`
The Corner Store|The man at his neighborhood store still calls him by his youth-football nickname. He has offered money for that nickname to stop appearing in front of teammates.
Park Lights|His childhood park shut its lights off at a fixed hour, whether their game was finished or not. He still argues that the touchdown scored in complete darkness should count.
The Equipment Room|His first shoulder pads came from a donated bin with another kid's name written inside. He remembers that name better than the score of his first game.
Youth League Reunion|His old youth team keeps a group chat devoted to embarrassing photographs. He tried muting it until somebody threatened to mail the photographs to his position coach.
Town Barber|His barber refuses to discuss football until he admits his latest haircut was worth the price. Both believe they are the more important talent in the relationship.
The Local Field|He visited his old practice field and discovered the intimidating hill was barely a slope. He immediately accused his youth coach of exaggerating its elevation for years.
Coach's Whistle|His youth coach used a whistle with a sound the whole neighborhood hated. He bought the same model as a joke, and his family made him leave it outside.
The Little Kids' Drill|He agreed to help at a youth football session and lost control during a water break. The children remember him as the coach who got hit by every sponge.
Friday Night Route|His high school bus passed the same house with a homemade football sign every Friday. He still checks whether the owner has updated the player's name.
The Fence Committee|Retired neighbors used to debate penalties through the fence during his pickup games. Their arguments regularly lasted longer than the games they were supposedly supervising.
`),
block('interests','any',`
Playlist Curator|He edits his warmup playlist as if a bad transition could cost the team points. Teammates sneak novelty songs into it whenever he leaves his phone unlocked.
Kitchen Experiments|He tried cooking a pre-practice meal from a professional athlete's video. The smoke alarm provided the only part of the routine his roommate wants repeated.
Fishing Mornings|A youth coach once promised a fishing trip if everyone stopped arguing at practice. He remembers catching nothing and complaining all the way home anyway.
Camera Roll|He photographs teammates when they think nobody is watching, especially their terrible travel outfits. His camera roll has become the reason several people are unusually polite to him.
Board Game Night|He runs board-game nights with teammates and refuses to explain a rule twice. This policy lasted until his own position coach joined and asked the same question six times.
Sneaker Notebook|He sketches cleat colorways during long rides and rates the team's footwear without permission. His harshest review is reserved for the pair he bought himself.
The Stadium Walk|He likes walking around empty stadium concourses when the building is quiet. He once got so absorbed in the old photographs that a custodian accidentally locked him in.
Sketchbook|He draws cartoons of football coaches in the margins of his notebook. One coach asked for a copy, which frightened him more than getting caught.
Movie Debates|He thinks the best football movies have the worst blocking scenes. Teammates have banned him from pausing the screen to point out another impossible protection.
Weekend Grill|He volunteered to grill at a football cookout and dropped the first batch through the grate. His teammates still ask whether dinner will be served above or below ground.
`),
block('routines','any',`
Bag Check|He once reached youth practice with two left cleats and blamed his brother. His brother still sends him a photograph of matching shoes before important trips.
The Spare Pen|He lends teammates pens during meetings and writes their names on a debt list. The list now includes a coach who insists that public employees should be exempt.
The Early Bus|He likes being first on the team bus so he can avoid sitting beside the bathroom. He considers this a practical achievement, not a sign of good character.
The Locker List|He wrote a list of personal football goals and hid it inside his locker. A teammate added become less annoying, and he has refused to cross it off.
Locker Archaeology|He claims to know where everything in his football locker is. The discovery of an unopened sandwich has made that explanation harder to defend.
Question in the Margin|He writes down questions during meetings but gets embarrassed about asking them. He usually corners a teammate afterward and starts with this is probably obvious.
The Window Seat|He insists on a window seat for team travel, then sleeps through the scenery. Teammates now require him to name one landmark before honoring the request.
The Wrong Calendar|He copied a football meeting time into the wrong week on his phone. He arrived extremely prepared for a meeting nobody else knew existed.
Shoelace Ritual|He reties his cleats until the loops feel identical. His youth coach timed the routine once and asked whether they needed to schedule a separate practice.
The Missing Glove|He searches for lost equipment loudly enough to recruit the whole locker room. His least successful investigation ended when somebody pointed at the glove already on his hand.
`),
block('arrival','true-freshman',`
The Campus Map|He got lost on the way to his first college football meeting and followed someone carrying a helmet. Unfortunately, that person was also a freshman who was lost.
The First Notebook|He brought a new notebook to his first team meeting and misspelled the coach's name on its cover. He now keeps that side against the desk.
The Move-In Box|His family packed his first college room while he was reporting for football activities. He returned to find his childhood team blanket displayed like a museum exhibit.
The Vocabulary Problem|He nodded through an unfamiliar term in his first college meeting. He has since asked three other freshmen what it means, and received three confident answers.
The First Alarm|He set several alarms for his first early football commitment. His roommate woke up to all of them while he slept through the first two.
The First Introduction|He introduced himself to the same older teammate twice during his first week in the program. The teammate now introduces himself back every time they meet.
The High School Bag|He brought his old high school football bag to campus rather than buying a new one. He is already tired of explaining the rival school's sticker his brother added.
The Practice Pace|He was so nervous at his first college practice that he jogged through the water break. An equipment assistant finally told him that drinking was allowed.
The Home Report|He told his family his first college football week was completely under control. He made the call while standing outside the building he had locked himself out of.
First Fall Checklist|He arrived with a carefully planned list for his first fall of college football. Finding somewhere to wash his clothes was not on it, which quickly became a problem.
`),
block('redshirt-freshman','rs-freshman',`
Second First Impression|He spent his redshirt year being called the new guy. He is irritated that another freshman class has arrived without anyone officially retiring the nickname.
The Redshirt Notebook|His redshirt-season notebook contains football notes and rankings of every dining-hall dinner. Teammates borrow it for reasons that have little to do with the playbook.
The Known Shortcut|During his redshirt year he discovered a shortcut to the football building. He now refuses to share it with anyone who mocked his first campus map.
The Question Year|He spent his redshirt season asking older teammates questions he would not ask coaches. He is now receiving those same questions and realizing how many answers were invented.
The Waiting Problem|He disliked redshirting and was not especially subtle about it. A coach finally told him that glaring at a practice schedule would not change it.
The Borrowed Routine|He copied an older player's warmup during his redshirt season without understanding half of it. He quietly abandoned the part that required carrying a tennis ball everywhere.
The Wrong Call|He learned enough football terminology while redshirting to correct someone at dinner. The corrected person was a coach, and the correction was wrong.
Beyond Move-In|His redshirt year taught him which team facilities had the best phone reception. Newcomers assume this knowledge required considerably more athletic achievement than it did.
The Old Photo|His family still shares the photograph from his redshirt year in which he looks furious on the sideline. He insists he was only trying to read the scoreboard.
The Freshman Argument|He has already redshirted but still gets included in every announcement addressed to freshmen. He accepts the eligibility label and disputes every cleaning assignment attached to it.
`),
block('early-years','young',`
The Younger Voice|He is still young enough that older teammates introduce him as their little cousin. He has started returning the favor by calling them uncle in front of visitors.
The First Fine|He tried introducing a joke fine system for teammates who arrived late to informal throwing sessions. Nobody paid, and someone fined him for inventing the system.
The Group Dinner|He is still figuring out whether the older players are joking when they give him instructions. Ordering dinner for twelve people was how he discovered that sometimes they are not.
The Wrong Shoes|He wore his nicest shoes to a team gathering that turned out to involve muddy grass. He has demanded more specific invitations ever since.
The Shared Table|Early in his college football experience, he sat at a table nobody had claimed. He now defends that table as if it has generations of program history.
The Week's Schedule|He thought a quiet afternoon on the football schedule meant he was completely free. Discovering the academic appointment he had forgotten spoiled a very confident nap.
The Bad Comparison|He compared himself to a famous player in front of older teammates. They still use the famous player's name whenever he drops his keys.
The Borrowed Playlist|He copied an older teammate's practice playlist to feel more settled in the program. He did not expect the older teammate's mother to appear on three voice recordings.
The Young Negotiator|He is trying to convince older teammates that freshman snack runs should include reimbursement. His campaign has produced a spreadsheet and almost no money.
The First Team Photo|He rehearsed a serious expression for a team photograph and blinked anyway. His family ordered that version, which he considers deliberate sabotage.
`),
block('veterans','veteran',`
The Established Seat|He has occupied the same football meeting seat long enough to resent finding someone in it. He denies this while standing beside that person's chair.
The Younger Questions|Younger teammates ask him which coaches tolerate jokes and which do not. He gives careful answers because some of his examples remain embarrassing.
The Old Nickname|He earned a ridiculous football nickname early in college and assumed it would disappear with time. Younger teammates now use it without knowing where it came from.
The Campus Expert|He gives new players confident directions around campus. He omits the fact that one of his favorite routes has been closed since construction began.
The Short Memory|He still remembers an ordinary practice mistake from early in college because teammates named it after him. He has not found the advice to forget mistakes especially useful.
The Class Photo|He recognizes fewer faces in old football photographs each year. He mostly uses the photos to mock everyone's former haircuts, including his own.
The Meeting Thermostat|He has spent enough college football meetings freezing that he brings a sweatshirt regardless of the weather. Younger teammates mock the habit until they start borrowing it.
The Veteran Advice|His most requested advice from younger players concerns cheap dinners, not football. He finds that assessment of his college experience both insulting and accurate.
The Replaced Routine|His early college routine included an elaborate pre-practice superstition. He dropped it after realizing he was mainly doing it because teammates enjoyed watching.
The Equipment Drawer|He has accumulated enough spare football gear to supply a small youth team. He loans it out selectively and remembers exactly who owes him a towel.
`),
block('last-ride','rs-senior',`
One Last Fall|He is a redshirt senior who has started collecting photographs from ordinary football days. He still refuses to be photographed looking sentimental.
The Last First Meeting|He went into his last first team meeting expecting to feel emotional. Mostly, he was annoyed that his favorite chair was gone.
The Old Locker|He wants one small piece of his football locker when his final season ends. The equipment staff has asked him to stop discussing removal methods.
Final-Year Group Chat|His friends keep suggesting names for his redshirt-senior farewell tour. He has rejected every one and secretly saved several.
The Closing Chapter|He has used his redshirt and reached his senior season, but still cannot imagine a fall without football. He changes the subject whenever someone asks what comes immediately afterward.
The Last Gear Issue|He made a joke about this being his final equipment pickup. The joke stopped being funny when somebody handed him a form about returning everything.
The Practical Inheritance|He is a redshirt senior trying to decide which younger teammate deserves his collection of football shortcuts. The best advice concerns avoiding the shower with unreliable hot water.
The Final Calendar|He has marked the end of his last college football season on a calendar. He deliberately covered the date with a takeout menu.
The Spare Fall|People still ask whether he can use another redshirt after his senior year. He is tired of explaining the answer and has begun referring them to a teammate.
The Last Team Dinner|He wants the redshirt seniors to organize one proper football dinner before they leave. Nobody agrees on a restaurant, which feels like an appropriate ending.
`),
block('redshirt','redshirted',`
The Sideline Reputation|His redshirt season gave teammates plenty of time to notice his elaborate sideline celebrations. He wishes they remembered his football work with the same precision.
The Waiting Argument|He spent part of his redshirt year arguing that patience was overrated. He now delivers suspiciously similar advice to younger players who complain about waiting.
The Spare Jersey|He kept an old practice jersey from the year he redshirted. He cannot decide whether it is a keepsake or simply a shirt he forgot to return.
The Notebook Margins|His redshirt-year notebook contains surprisingly detailed cartoons of football meetings. He refuses to identify which coach is represented by the angry refrigerator.
The Eligibility Conversation|He has already used his redshirt and still gets dragged into arguments about everyone's listed class. He carries no official authority, despite speaking as though he does.
The Redshirt Dinner|During his redshirt year, a few teammates started meeting for cheap dinners after football activities. They are still arguing about who failed to pay for the first one.
The Imitation|He spent his redshirt season perfecting an impression of a coach's favorite phrase. The coach eventually heard it and began requesting performances.
The Old Sideline Seat|He remembers the spot where he spent much of his redshirt season waiting between football duties. He still checks whether anyone else has claimed it.
The Borrowed Sweatshirt|He borrowed a teammate's sweatshirt during his redshirt year and never returned it. He describes it as a historical artifact when repayment is mentioned.
The Redshirt Photograph|A redshirt-season photograph shows him celebrating something outside the camera frame. Nobody remembers what happened, but his family has framed the evidence anyway.
`),
block('developmental','low-overall',`
The Honest Coach|A youth coach once told him that enthusiasm and ability were separate categories. He disliked the assessment but admits his current football still requires plenty of work.
The Pet Highlight|He has one high school football clip he shows whenever someone asks about his game. His friends know the clip well enough to narrate it before he presses play.
The Practice Bargain|He bargains with himself over extra football work by promising takeout afterward. He has been much more consistent about honoring the second half.
The Basics Argument|He gets embarrassed when coaches revisit basic football instructions in front of him. Pretending he knew them already has not made the instructions disappear.
The Shortcut|He has searched for a football shortcut in enough training videos to fill a semester. His roommate thinks learning to close the app would be the first useful result.
The Comparison Video|He once compared his football film with an elite player's and stopped the video very quickly. He now limits the comparison to their similar choice of gloves.
The Helpful Job|He is not especially polished on the field but knows how to repair the team's temperamental speaker. He would prefer coaches to mention the first problem less often.
The Backyard Favorite|He was the undisputed football star of a very small family backyard. His cousins still cite that competition when defending him much too loudly.
The Unfinished Checklist|He wrote a football improvement checklist and spent longer decorating it than completing it. A coach asked to see the undecorated version.
The Running Joke|He laughs first when a football drill goes badly, partly so nobody else gets there before him. He dislikes how often that strategy is necessary.
`),
block('polished','high-overall',`
The Confident Introduction|He introduces himself as someone opponents should remember. Teammates consider his football ability good enough to make the line tolerable, if not pleasant.
The Unwanted Compliment|He gets irritated when a football compliment includes surprise about his talent. He has begun asking exactly which part was supposed to be surprising.
The Price of Advice|He is good enough that younger players seek his football advice. His roommate would like them to know how rarely that advice extends to cleaning.
The Favorite Rep|He has a practice clip he replays whenever someone doubts his football confidence. Coaches have asked whether he owns any other footage.
The Coasting Argument|His talent makes an ordinary rep look easier than his effort sometimes deserves. A coach has learned to distinguish the two, much to his annoyance.
The Demanding Parent|His family watches his football with standards that praise from strangers cannot soften. He can have a strong practice and still receive a message about one sloppy detail.
The Coach's Challenge|He answers tough football coaching with visible irritation before doing what was asked. Both sides consider this arrangement productive and unnecessarily loud.
The Phone Background|He uses a favorite football photograph of himself as his phone background. He argues that being good at something should come with a few privileges.
The Better Opponent|He dislikes being paired with an easy opponent in football drills. He dislikes losing to the harder opponent even more.
The Talent Tax|His teammates ask him to demonstrate difficult football movements whenever a coach wants an example. He considers this the least enjoyable reward for being talented.
`),
block('upside','high-potential',`
The Unfinished Project|A coach described him as a football project with a high ceiling. He asked whether that meant somebody else would be doing the construction.
The Compliment Problem|He likes hearing that his football could improve dramatically. He likes hearing about the work required noticeably less.
The Future Version|He has joked about what the future version of his football self will demand in appearance fees. His friends plan to charge interest on every favor.
The Family Prediction|His uncle makes enormous predictions about his football future at every gathering. He spends half the meal trying to steer the conversation toward anybody else.
The New Habit|A coach sees plenty of football potential in him and keeps assigning additional work. He suspects the compliment was partly a scheduling tactic.
The Longer Plan|He bought an expensive notebook for a long-term football development plan. The first page contains a complaint about the notebook's price.
The Unexpected Encouragement|A coach who rarely compliments anyone told him his football had unusual room to grow. He pretended to shrug it off and repeated it to three relatives.
The Open Notebook|He is excited about his football upside but hates being discussed as unfinished. He has started reminding people that finished products can also be irritating.
The Patient Teammate|He has a teammate willing to explain football mistakes without making a public performance of it. He returns the favor by fixing that teammate's terrible outfits.
The Ceiling Joke|His friends call him ceiling whenever his football potential comes up. He wishes they had chosen a nickname that sounded less like a hardware-store aisle.
`),
block('limited-upside','limited-potential',`
The Realistic Goal|He knows his football ceiling is limited and hates being given an inspirational speech about it. A clear job description is more useful to him than another miracle story.
The Summer Shift|Stocking shelves taught him how long a clock can take to move. He sometimes complains about football work, but still prefers it to the freezer aisle.
The Field Volunteer|He once helped mark a youth football field and made the end zone several steps too short. Nobody lets him offer strong opinions about field dimensions anymore.
The Equipment Critic|He may not have limitless football upside, but his equipment opinions are extremely confident. Teammates have rejected his proposal to grade everyone's accessories.
The Mailed Schedule|An old coach mailed him a football practice schedule as a reminder to stay useful. He phoned back to ask whether postage was really necessary.
The Honest Assessment|He requested brutally honest football feedback and immediately wished he had requested something gentler. He still keeps the notes, mostly folded shut.
The Useful Favor|He knows the equipment staff's coffee orders better than his own football highlights. He dislikes suggestions that these are unrelated measures of team value.
The Repair Notebook|His father records every repair that keeps an old car running. He borrowed the notebook format for football and immediately lost the notebook.
The Current Player|He is tired of discussing the football player he might someday become. He would rather argue about whether he is getting enough credit for the one he already is.
The Last Argument|He can accept a limited football ceiling more easily than losing an ordinary argument. His roommate has learned not to confuse realism with humility.
`),
block('speed','fast',`
The Recess Rematch|He still demands a rematch from the kid who beat him in a childhood race. His current football speed has made arranging a fair head start impossible.
The Head Start|Friends negotiate increasingly absurd head starts before racing him. He considers twenty yards excessive and still sometimes accepts.
The Wrong Direction|A youth coach once told him that sprinting the wrong way was not a useful football skill. The phrase followed his speed all the way into family conversations.
The Sprint Home|He used to race the last stretch home after backyard football. His sister says the finish line moved whenever he was behind.
The Burst Argument|He claims his football acceleration could beat anyone to the last slice of pizza. Nobody has approved using the kitchen to test this.
The Open Stretch|He enjoys open-field football space partly because it lets him show off. He denies slowing his walk afterward to see who noticed.
The Finish Line|He learned to sprint through finish lines after losing a race while celebrating early. His family has no intention of deleting the video.
The Chase|He used to volunteer to chase stray footballs because he could get there first. He stopped volunteering once everyone began kicking them farther on purpose.
The Quick Steps|His first steps are quick enough that teammates ask him to demonstrate football get-offs. He would rather they asked him to demonstrate sitting down.
The Recess Committee|He was banned from one playground race after refusing a handicap. He maintains that football has only made his position on handicaps stronger.
`),
block('strength','strong',`
Moving Day|His strength has made him the default furniture mover in his football circle. He now asks about stairs before agreeing to visit anyone.
The Heavy End|Teammates always hand him the heavier end during awkward equipment moves. He has started claiming a mysterious weakness limited to borrowed couches.
The Weight-Room Argument|He is stronger than most people expect and insists that should settle unrelated football arguments. Coaches have not accepted the logic.
The Stubborn Lid|His family saves stuck jars for him like unofficial strength tests. He complains that his football training has become unpaid kitchen labor.
The Loud Plate|He put a plate down too loudly in a weight room and spent the next hour hearing about it. He now lowers everything with exaggerated delicacy.
The Old Teammate|An old teammate still claims he taught him how to lift. He remembers the same teammate asking for help loading the bar.
The Strongman's Patience|His strength draws challenges from people who want to test him outside football. His favorite answer is asking whether the challenge includes carrying groceries.
The Careful Lift|He can move heavy football equipment without much trouble. He still managed to break a flimsy shelf by leaning on it while explaining this.
Family Workday|His relatives schedule heavy yard work around his visits home from football. He suspects they are more interested in his strength than his stories.
The Leverage Lecture|He has heard enough football lectures about leverage to deliver one himself. He chooses to do so whenever someone asks him to open a tight jar.
`),
block('technical','technical',`
The Cone Diagram|He arranged a football drill so precisely that teammates accused him of measuring the grass. He produced a tape measure, which did not help his defense.
The Demonstration|He prefers the technical side of football and enjoys demonstrating small corrections. Teammates enjoy asking him to demonstrate his notoriously bad parking.
The One Detail|A coach corrected a detail in his football stance and he argued for several minutes. He later adopted the correction without acknowledging the conversation.
The Why Question|He wants an explanation before changing his football technique. One coach now begins every answer with because you are about to ask.
The Broken-Down Drill|He breaks football movements into pieces until even patient teammates get restless. He is less methodical about putting furniture together.
The Craft Argument|He thinks precise positional skills deserve more attention than spectacular athletic clips. His friends have heard this opinion under nearly every football highlight.
The Slow-Motion Clip|He paused a football clip to show a tiny technical detail. His audience mainly noticed the terrible expression on his face.
The Good Rep|He is proud of a technically clean football rep that looks uneventful to everyone else. He has stopped trying to show it at parties.
The Small Adjustment|He likes detailed football instructions but resents being told how to stack the dishwasher. His roommate has pointed out the inconsistency repeatedly.
The Stance Photograph|He keeps a football stance photograph for technical reference. His sister uses the same photograph to make birthday cards.
`),
block('small','small-build',`
The Equipment Search|His youth team struggled to find football pads small enough for him. The final pair had somebody else's name written inside in enormous letters.
The Size Question|He gets tired of strangers asking whether his smaller frame belongs on a football roster. He has begun asking whether they belong on a judging panel.
The Tape Measure|He argues that football measurements should not count shoes with thick soles. He makes this argument most strongly when somebody measures him without them.
The Small Gear Bag|His football equipment takes up less space than some teammates' gear. He still claims more than his share of the team-bus overhead compartment.
The First Impression|People often notice his smaller football build before anything else. He enjoys waiting until they finish their assumptions before introducing himself.
The Fit Check|A youth football volunteer once padded out equipment that kept sliding off his shoulders. He remembers the volunteer's patience and his own refusal to stop complaining.
The Wrong Size|He ordered a football team sweatshirt based on a larger teammate's recommendation. His family now refers to it as the camping tent.
The Introduction|He dislikes being introduced as undersized before someone mentions his football position. He once introduced the offending teammate as chronically late.
The Borrowed Pads|Borrowed youth football pads once made him look far larger than he was. His family still uses the photograph whenever he criticizes their clothes.
The Height Argument|He has a smaller frame at his football position and no patience for exaggerated roster heights. He also insists the family height chart was mounted crooked.
`),
block('large','large-build',`
The Back Row|Football team photographs usually place him at the back because of his frame. He says this is discrimination against people with excellent facial expressions.
The Legroom Vote|He notices legroom before anyone else on football trips. He campaigns for better seats with the persistence of someone running for office.
The Gear Bag|His larger football equipment makes packing look like an emergency evacuation. He regularly accuses teammates of stealing the space around his bag.
The Door Frame|He ducked under a football equipment-room doorway that did not require ducking. Teammates have described it as an expensive-looking physical reflex.
The Size Assumption|People assume his larger football build means he enjoys being the center of attention. He would prefer they used that attention to find a bigger chair.
The Seat Trade|His teammates offer him cramped seats just to hear his negotiations. He has started charging imaginary transfer fees for every football-trip seating change.
The Sleeve Search|Finding everyday shirts that fit his football frame is difficult enough. His friends still insist he dress up for plans they describe as casual.
The First Question|New acquaintances tend to ask his football measurements before his name. He answers with increasingly suspicious numbers to see whether anyone notices.
The Smaller Friend|His oldest friend still remembers when they could share football gear. He refuses to retire a photograph proving they were once roughly the same size.
The Online Order|He checks measurements before ordering football clothes online. He learned this after receiving a pair of trousers he could barely fit one leg into.
`),
block('quarterbacks','qb',`
The Receipt Playbook|He drew quarterback plays on grocery receipts as a child. His mother still owns one diagram requiring a receiver to hurdle a parked car.
The Pickup Huddle|He organized pickup huddles so seriously that cousins threatened to leave. His solution was to appoint them assistant coordinators.
The Coverage Sketch|He explained a quarterback read using condiment bottles at dinner. The waitress cleared the defense halfway through his argument.
The Receiver's Version|He asks receivers about their routes, then debates the answer. A teammate has suggested trying the listening part without the quarterback cross-examination.
The Snap Discussion|He and a childhood center invented names for disastrous snaps. His family still uses one of those names whenever he drops something.
The Call Sheet|He used to make fake quarterback call sheets for backyard games. His brother would steal them and demand that he audible.
The Throwing Partner|An older neighbor threw footballs with him after school. The neighbor now claims partial credit for every throw and no responsibility for the bad ones.
The Language Problem|He likes comparing different names for quarterback concepts. He once confused a coach by confidently using terminology borrowed from a video game.
The Huddle Impression|He practiced his quarterback huddle voice in the mirror as a kid. His sister still does an impression that sounds nothing like the version he remembers.
The Backyard Fence|He broke a neighbor's fence while trying to prove he could make a difficult quarterback throw. His family still calls that fence his most expensive completion.
`),
block('offensive-skill','offensive-skill',`
The Extra Catch|He will toss a football with almost anyone until they start coaching his hands. He believes unpaid throwing sessions should have clear limits.
The Route Argument|He and his childhood friends argued over whether a route counted as improvisation or cheating. His offensive football opinions remain suspiciously convenient.
The Kitchen Ban|His grandmother banned footballs from the kitchen after a broken lamp. He still tucks a loaf of bread under his arm when carrying groceries.
The Sideline Paint|As a kid he used sidewalk cracks to practice staying inbounds. A neighbor finally asked him to stop stomping past the window during dinner.
The Celebration Committee|He has designed touchdown celebrations he may never have reason to use. Teammates judge the rehearsals more harshly than any defensive back could.
The Blocking Complaint|He complains about offensive drills that do not involve touching the ball. His coach responds by mentioning the complaint before assigning another one.
The Timing Question|He was once blamed for a backyard football play that failed before anyone moved. He continues to insist the snap count was negotiable.
The Younger Brother|His younger brother made him run offensive routes until the streetlights came on. He now claims the boy owes him several years of receiving fees.
The Grass Diagram|He drew an offensive play in somebody's lawn with a mower as a teenager. The homeowner understood the diagram and still wanted him grounded.
The Touch Count|He claims not to care how often an offensive play includes him. His friends have noticed that he can recount those totals without checking anything.
`),
block('offensive-line','ol',`
The Five Seats|His high school offensive line claimed a lunch table all year. He still gets offended when friends suggest that was mostly about the food.
The Glove Argument|He can spend longer discussing offensive-line gloves than buying normal clothes. His girlfriend has asked why dinner reservations receive less research.
The Protection Lecture|He explained a protection call at a family barbecue using empty chairs. Nobody sat down for ten minutes because he kept adjusting the formation.
The Line-Room Seat|An old offensive-line teammate still owes him lunch after losing a ridiculous bet. Both have kept the argument alive far longer than the friendship requires.
The Wrestling Tryout|A football coach encouraged him to try wrestling for balance and leverage. He remembers the early weigh-ins more vividly than any technical benefit.
The Older Lineman|An older high school lineman patiently explained assignments when he was new. He repaid the kindness by borrowing the player's gloves and losing one.
The Last Seat|He believes offensive linemen deserve the best chairs at team dinners. His evidence is a speech nobody has agreed to hear twice.
The Stance Joke|His family insists he stands like an offensive lineman even when waiting for coffee. He denies it until someone shows him a photograph.
The Shared Answer|He likes solving blocking arguments with other linemen and dislikes admitting when they are right. His apologies usually arrive disguised as a restaurant recommendation.
The Practice Finish|He takes offensive-line practice personally enough to argue about a final rep on the way home. His old coach still refuses to revisit their oldest dispute.
`),
block('defensive-line','dl',`
The Old Collision|He once collided with a tackling dummy so enthusiastically that it knocked over a youth coach's drink. The coach still introduces him as the reason for the lid rule.
The Rush Notebook|His defensive-line notebook contains names for rush combinations that coaches have never approved. His favorite is mostly an excuse to say something ridiculous before contact.
The Gap Argument|He used to argue defensive gaps with an offensive-line friend over video games. Their real football disagreements are less polite and considerably better informed.
The Hand Check|A youth defensive-line coach checked his fingernails before every practice. He still files them before team activities and resents being reminded why.
The Opposite Stance|His oldest football friend became an offensive lineman. They swap clips mainly to accuse each other of getting away with holding.
The Run Complaint|He enjoys the idea of chasing quarterbacks more than the less glamorous defensive-line assignments. His coach can usually tell which kind of drill is next from his expression.
The Crowded Garage|He grew up repairing engines with an uncle in a cramped garage. He says playing on the defensive line offers slightly more room and much worse conversation.
The Second Move|He invented an elaborate pass-rush move during backyard football that nobody could remember afterward. His cousins still insist he gives it a different name each summer.
The Front's Speaker|He appointed himself the defensive line's unofficial music director. Nobody voted for him, and several teammates are planning a peaceful transfer of power.
The Ball-Carrying Day|His youth coach let defensive linemen carry the football at the end of practice. His family still owns a video explaining why this remained an occasional privilege.
`),
block('back-seven','back-seven',`
The Backyard Coverage|He spent childhood one-on-ones accusing his friend of pushing off. His friend still answers every defensive football argument with a video of him doing the same thing.
The Loud Check|He practiced defensive calls loudly enough that his roommate could repeat them. The roommate has begun requesting credit for participating in football preparation.
The Receiver Friend|His childhood best friend always played receiver while he preferred defense. Neither agrees about the all-time score, and both have witnesses of questionable reliability.
The Missed Angle|He once misjudged a backyard football pursuit angle and landed in a hedge. His family considers the hedge part of his official defensive development.
The Motion Argument|He watches offensive motion suspiciously even in casual football games. His cousins move before every snap purely to start the debate.
The Help Call|He is particular about defensive communication but not about returning ordinary text messages. Friends have asked whether announcing a coverage check would get a faster response.
The Old Outfield|He played center field in neighborhood baseball before preferring defensive football. The old baseball friends still blame him whenever a ball disappears into tall grass.
The Couch Coordinator|His family paused televised games to argue defensive coverages when he was growing up. He now understands the argument better and finds the pauses more annoying.
The Eye Discipline|A childhood coach caught him watching the wrong part of a football drill. His relatives repeat the coach's warning whenever an attractive stranger passes.
The Pursuit Landmark|He learned pursuit angles by chasing cousins around a large backyard tree. He insists the cousin who climbed it should have been declared out of bounds.
`),
block('specialists','specialist',`
The Repeatable Setup|He set up football kicking targets in a childhood yard with strict rules about distance. His neighbor added a stricter rule about the windows.
The Weather Forecast|His interest in kicking made him unusually attentive to wind. His family now holds him personally responsible when a cookout gets rained out.
The Quiet Corner|He preferred working on football kicks at an empty park while friends played basketball. They mostly joined him when he needed somebody to retrieve balls.
The Contact Point|He once explained kicking contact using a dinner roll and a butter knife. The demonstration ended with somebody requesting a different topic.
The Waiting Game|His specialist practice setup includes more waiting than his friends expect. He fills it by inventing increasingly petty competitions over who can hit a marker.
The Familiar Spot|He claimed a patch of grass for childhood kicking practice. His father eventually moved the target to save the lawn and became an alleged enemy of football.
The Old Soccer Ball|An old soccer ball introduced him to kicking long before football did. He keeps it at home despite a sibling's repeated attempts to donate it.
The Tiny Correction|He can explain a specialist adjustment at length to an unwilling audience. His family has developed a rotating system for accepting those calls.
The Garage Wall|He started by kicking a soft ball against a garage wall. The garage's owner remembers this phase of his football development less fondly than he does.
The Reset Routine|He has a private little reset ritual between football kicks. He refuses to describe it because a teammate once tried to sell demonstrations.
`)
]);
export const BACKSTORIES=Object.freeze([...BACKSTORY_GROUPS.flatMap(group=>group.stories.map((story,index)=>Object.freeze({id:`${group.id}-${String(index+1).padStart(2,'0')}`,rule:group.rule,topic:'football',...story}))),...EXTRA_BACKSTORIES.map(story=>Object.freeze({...story,topic:/^(?:character-|social-circle-)/.test(story.id)||/^off-field-0[1-9]$/.test(story.id)?'football':'personal'})),...EASTER_EGG_BACKSTORIES.map(story=>Object.freeze({...story,topic:'football'}))]);
