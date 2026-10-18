// New non-football stories use fictional personal details, not fabricated
// performance records, recruiting rankings, eligibility or real NIL contracts.
const block=(id,category,text)=>({id,category,stories:text.trim().split('\n').map(line=>{const [heading,...body]=line.split('|'),parts=heading.split('~');return {rule:parts.length===2?parts[0]:'any',title:parts.at(-1),text:body.join('|')};})});
export const EXPANSION_GROUPS=Object.freeze([
block('off-field','Off the Field',`
performer~The Last Song|He plans to leave every party after one more song. His friends have learned that this estimate restarts whenever the music gets better.
The Open Door|He props his room door open when he wants company and closes it when he needs quiet. The system works better than his roommate's habit of shouting down the hallway.
The Couch Reservation|His ideal free evening involves a familiar couch, takeout and absolutely no complicated plans. He will still dress properly if someone explains that the invitation is not optional.
performer~Campus Nightlife Correspondent|He always seems to know which student event will be worth the walk. Nobody remembers appointing him to the role, but the group still asks for his recommendations.
The Sunrise Walker|He likes being outside before the campus gets crowded. It is the one stretch of the day when nobody asks what he has planned next.
The Dining Hall Regular|He has a preferred dining-hall route and gets annoyed when the stations change. Friends treat watching him find a new lunch plan as a minor campus event.
The People Watcher|He can spend a whole break sitting outside with a drink and watching campus go by. He insists it counts as doing something even when he has no intention of moving.
performer~One More Invitation|He accepts invitations before checking whether they overlap. His calendar looks impressive until somebody asks how he intends to attend three events at once.
The Homebody's Excuse|He once invented an elaborate reason to miss a gathering when he really wanted to stay home. Now he simply tells friends he has a reservation with his couch.
The Laundry Window|He tries to find the least crowded time to do laundry. This has turned him into an unlikely authority on when everyone else in the building wakes up.
The Campus Shortcut|He is convinced he knows a shortcut between every important place on campus. The confidence is strongest on routes nobody has timed.
performer~The Dance-Floor Volunteer|He is usually the first friend willing to start dancing when a room feels awkward. Whether the dancing is good has never been central to his decision.
The Late Snack Route|He organizes his free evenings around which food places will still be open afterward. Friends who forget to eat have learned to follow his lead.
The Quiet Movie Night|He likes inviting a few people over rather than finding the busiest event in town. His only firm rule is that nobody gets to spend the entire movie choosing the next one.
The Coffee Shop Seat|He has a favorite coffee-shop seat because it is near an outlet and far from the door. He considers those practical advantages worth arriving early for.
The Errand Collector|He keeps putting small errands together until a simple trip becomes an entire afternoon. At least one friend has started asking for an itinerary before joining him.
The Grocery Walk|He prefers walking to buy groceries when the list is short. Remembering that preference does not stop him from buying more than he can comfortably carry.
performer~The Spontaneous Host|He can turn an ordinary evening into a gathering with a few messages. He is much less organized about finding enough chairs afterward.
The Weekend Nap|He takes a weekend nap seriously enough to warn people in advance. Most of his friends respect the warning because waking him rarely produces useful conversation.
The Campus Concert|He likes going to student concerts without knowing the performers beforehand. Discovering one good song makes the whole evening feel worthwhile.
The Balcony Conversation|He enjoys conversations that happen slightly away from the main gathering. A quieter corner often keeps him out later than the party itself would have.
The Breakfast Plan|He makes ambitious breakfast plans whenever he has a free morning. Following through usually depends on whether someone is willing to knock on his door.
The Spare Hoodie|He keeps a spare hoodie in his bag because campus weather never follows the forecast he remembers. Friends have occasionally benefited from the habit before he does.
performer~The Festival Schedule|He reads the student-events calendar like other people read a menu. His biggest problem is deciding which free activity deserves his limited free time.
The Phone-Free Hour|He tries to spend one quiet hour away from his phone when he can. The first few minutes are mostly spent checking where he left it.
The Room Reset|He cleans his room thoroughly whenever he wants to feel more organized. The feeling usually lasts longer than the clean desk does.
The Local Explorer|He likes finding inexpensive places beyond the usual campus stops. Friends now send him suggestions as if he is compiling an official guide.
The Practical Backpack|His backpack contains enough ordinary supplies to rescue a badly planned day. He is less reliable about remembering which pocket contains them.
The Unplanned Picnic|He will happily eat an ordinary meal outside if the weather cooperates. Calling it a picnic makes the same sandwich feel like a much better plan.
The Hallway Greeting|He says hello to people often enough that a short trip through his building can take a while. He does not mind until he remembers he was going somewhere specific.
performer~The Birthday Organizer|He takes friends' birthdays as an excuse to plan something memorable. The birthday person occasionally has to negotiate the definition of memorable.
The Comfortable Routine|He likes knowing where he will eat, when he will recharge and which friends will be around. Familiar plans are his favorite kind of luxury.
The Shared Umbrella|He carries an umbrella large enough that people regularly ask to walk with him. Bad weather has become an unusually reliable way for him to meet somebody.
The Tiny Plant|He bought a small plant to make his room feel less temporary. Its continued survival has become a point of personal pride.
The Off-Campus Bench|He found a quiet bench on a walk and started returning when he wanted a break. He has kept its location to himself mostly because he likes how quiet it stays.
The Ticket Reminder|He sets reminders for campus events he wants to attend. The reminder is often the first time he realizes the event is already sold out.
The Window Open|He likes fresh air enough to open a window whenever he can. His roommate has a more conservative understanding of acceptable indoor temperatures.
The Long Dinner|He enjoys meals that turn into conversations after everyone has finished eating. The staff clearing nearby tables is usually what reminds him to leave.
The Saturday Bookshop|He likes browsing a bookshop without arriving with a particular title in mind. He often leaves with something unrelated to the reason he went inside.
The Recovery of Sunday|He likes keeping one part of Sunday deliberately unplanned. After a crowded week, choosing to do very little feels like making a decision rather than avoiding one.
`),
block('character','Personality & Character',`
performer~The Best-Dressed Claim|He calls himself the best-dressed person in any room before checking the competition. His friends keep photographic evidence for occasions when the claim needs challenging.
performer~The Self-Appointed Expert|He has a confident opinion about subjects he has only recently discovered. Admitting he is learning would ruin the presentation, so friends ask increasingly specific questions.
performer~The Entrance|He has a talent for entering a room as though somebody announced him. Even a trip to collect a forgotten charger can look like an appearance.
performer~The Victory Speech|He prepares victory speeches for games that have not started. Friends enjoy beating him mostly to hear how he revises the ending.
performer~The Friendly Rivalry|He turns choosing dinner into a competition over who has the better suggestion. He loses surprisingly often for someone who campaigns so confidently.
performer~The Outfit Consultation|He claims not to need anyone's fashion advice, then sends three mirror pictures. His group chat has agreed to pretend this is a quality-control procedure.
performer~The Main Character|He narrates minor inconveniences as if they belong in a documentary about his life. Friends are not always willing to play the supporting roles he assigns them.
performer~The Loud Prediction|He makes bold predictions about ordinary things, including which elevator will arrive first. Being wrong rarely seems to reduce his enthusiasm for the next prediction.
unpredictable~The Bad Idea Committee|He can spot a harmless bad idea and become its strongest advocate in seconds. His friends have learned that laughing is not the same as agreeing to participate.
unpredictable~The Dramatic Apology|He once delivered an unnecessarily formal apology for eating somebody else's leftovers. The speech is now quoted whenever food disappears from the shared refrigerator.
team-first~The Credit Redirect|He gets uncomfortable when a simple favor becomes a big public compliment. His usual response is to point out somebody else who helped.
team-first~The Quiet Favor|He remembers small problems friends mention in passing. People sometimes realize he solved one before they remember asking for help.
team-first~The Extra Seat|He notices when someone is standing outside a conversation and moves to make room. It is a habit he picked up from a relative who hated seeing anybody left out.
team-first~The Last Slice|He asks whether anyone wants the last slice before taking it. Friends have occasionally made him regret being so considerate.
team-first~The Good Listener|He lets people finish an explanation even when he thinks he understands the problem. That patience has made him a popular person to find after a difficult day.
team-first~The Small Thank-You|He believes people doing routine work deserve to hear thanks. He has no dramatic explanation for it beyond remembering how different a simple acknowledgment can feel.
team-first~The Borrowed Charger|He lends things out without making a ceremony of it. His only complaint is that his best charger now seems to live in several different rooms.
team-first~The Cleanup Crew|He tends to stay behind when a group activity needs cleaning up. Friends sometimes remain too, partly to help and partly to avoid looking bad next to him.
team-first~The Shared Win|He is more likely to ask how everyone did than begin with his own result. People trust that interest because he asks the same question when nobody is keeping score.
team-first~The Unrequested Backup|He quietly makes a second plan when a friend is nervous about something. Usually the friend never needs it, but he likes having a useful answer ready.
reserved~The Warm-Up Conversation|He takes a little time to settle into an unfamiliar group. Friends who know him well enjoy watching strangers discover he has jokes too.
reserved~The Soft Voice|He dislikes repeating himself across a noisy room. Rather than compete with the volume, he usually waits until someone comes close enough to hear him.
reserved~The Written Reply|He writes clearer messages than he gives spontaneous speeches. Given a few minutes to think, he can explain himself much more comfortably.
reserved~The Small Circle|He prefers a few dependable friendships to knowing every person at an event. That does not stop his more outgoing friends from introducing him to everyone anyway.
reserved~The Observation First|He likes getting a feel for a room before contributing much. People sometimes mistake the pause for disinterest until he mentions a detail they missed.
reserved~The Surprise Joke|He may be quiet for an entire conversation before delivering its best joke. He seems to enjoy the surprise as much as the punch line.
reserved~The Practice Introduction|He has been known to rehearse an introduction before meeting someone important. It helps until the person opens with a question he did not prepare for.
reserved~The Quiet Celebration|He celebrates good news with a small call or a favorite meal. Friends who expect a big announcement sometimes learn about it much later.
reserved~The Thoughtful Pause|He is comfortable letting a conversation have a pause. He would rather think about an answer than provide one simply to fill the silence.
reserved~The Familiar Faces|He becomes much more talkative once a place feels familiar. Close friends describe a different version of him from the one most new acquaintances meet.
driven~The Five-Minute Rule|He likes arriving with five minutes to spare. Waiting outside a closed door feels preferable to explaining why he rushed in late.
driven~The Serious Planner|He enjoys plans that tell him what needs doing and when it should be finished. Friends enjoy reminding him that lunch does not always need that level of organization.
driven~The Unfinished Task|He finds it difficult to relax while a manageable task remains unfinished. His idea of treating himself often begins with clearing the last item off a list.
driven~The Direct Answer|He prefers a clear answer to a comforting guess. Friends know he is trying to be useful, even when the first version comes out a little too blunt.
driven~The Personal Deadline|He sets himself deadlines earlier than the official ones. The habit gives him time to fix problems without turning every assignment into an emergency.
driven~The Competitive Board Game|He reads the rules before a board game instead of learning as he goes. His friends accuse him of preparing for a championship that does not exist.
unpredictable~The Goofy Voice|He has a different voice for reading almost every message aloud. Friends sometimes send him ordinary notices just to hear the interpretation.
unpredictable~The Impulse Hobby|He occasionally becomes fascinated with a new hobby over a single weekend. The enthusiasm is genuine, even when the equipment collection outlasts the interest.
unpredictable~The Unnecessary Costume|He once brought a costume to an event where nobody else dressed up. Explaining that it was optional did not make him regret the decision.
unpredictable~The Running Bit|He is willing to keep a harmless joke alive far longer than anyone expects. The group has learned that asking him to stop may become part of the joke.
`),
block('dating','Relationships & Dating',`
The Shared Playlist|He and his girlfriend keep adding songs to the same playlist. Neither will admit that skipping the other's choice has become a minor relationship negotiation.
The Long-Distance Dinner|He sometimes eats dinner on a video call with someone he is dating. Getting the timing right has proved more difficult than choosing what to order.
The Thoughtful Reminder|He puts important relationship dates in his calendar rather than trusting his memory. He considers remembering by reminder better than forgetting with confidence.
The Bad First Date|He once arrived at the wrong branch of the restaurant chosen for a date. They salvaged the evening, but he still checks addresses more carefully now.
The Unclear Stage|He is seeing someone, although neither seems eager to define what that means. His friends have heard several explanations and remain no better informed.
The Breakup Playlist|After a breakup, he built a playlist intended to help him move on. He now mostly remembers how dramatic his song choices were.
The Quiet Couple|He prefers keeping his relationship away from public posts. People close to him know the important details without needing a running announcement.
The Date-Night Cook|He tried cooking for a date instead of making a reservation. One dish worked well enough that he has been relying on it ever since.
The Helpful Friends|His friends offer dating advice with much more confidence than consistency. He has learned to ask what happened the last time they followed their own suggestions.
The Slow Reply|He tends to write a message, reconsider it and then forget to send it. A person he dated once asked whether his phone needed a less complicated approval process.
The Childhood Connection|He is dating someone who knew him before college football became part of his identity. Their best stories about each other rarely have anything to do with sports.
The Movie Compromise|He and his girlfriend have very different ideas about a good movie. Taking turns choosing has produced a much broader education than either expected.
The Honest Breakup|A relationship ended after they admitted their plans were pulling in different directions. He still appreciates that they managed an uncomfortable conversation without turning it into a feud.
The Almost-Date|He once spent most of an evening unsure whether he had been invited on a date. Asking directly would have helped, but he arrived at that conclusion a little late.
The Restaurant Scout|He saves interesting restaurant ideas when he is not hungry. They become much more useful when somebody asks him to suggest a place for a date.
The Handwritten Card|He prefers writing a short card to buying an elaborate gift. He takes the wording seriously enough that the first draft rarely survives.
The Familiar Advice|A relative regularly asks whether he is dating anyone, regardless of why he called. He has developed several answers that somehow never end the conversation.
The Sudden Introduction|He once met a date's family while dressed for what he thought was a very casual errand. The resulting photograph is considered much funnier by everyone else in it.
The Shared Errand|He enjoys ordinary errands with his girlfriend more than elaborate plans. A grocery trip is easier to arrange than a perfect evening anyway.
The Cleared Photos|He took his time clearing old relationship pictures from his phone. The difficult part was deciding which memories belonged to a person and which simply belonged to his own life.
The Different Schedules|He is dating someone whose timetable rarely matches his. They have become skilled at treating a short coffee together as a real plan rather than a consolation prize.
The Friend-Zone Joke|His friends still tease him about taking too long to admit he liked someone. He maintains that gathering information was a sensible first step.
The Unsent Paragraph|He once wrote a long message about a relationship problem and wisely did not send it. A shorter conversation the next day turned out to be more useful.
The New Boundary|A breakup taught him that being available all the time is not the same as being thoughtful. He is trying to communicate his schedule instead of making promises he cannot keep.
The Music Disagreement|He and someone he is dating disagree strongly about one musician. The argument has become so familiar that each can now deliver the other's defense.
The Mutual Friends|A relationship began through mutual friends who claim full credit for the introduction. He suspects they will still mention it if the couple ever reaches a major anniversary.
The Low-Key Anniversary|He likes marking relationship milestones with something familiar rather than expensive. Remembering a favorite snack has worked better for him than trying to invent a grand gesture.
The Accidental Double Date|A simple meal once became a double date after two friends appeared with their own plans. Nobody objected until it was time to divide a complicated bill.
The Better Question|He is learning to ask what someone wants instead of assuming a thoughtful surprise will cover it. The change has made planning dates easier for both people involved.
The Roommate's Introduction|His roommate introduced him to someone, then became much too interested in the outcome. He has requested that future updates not be discussed like a weekly television episode.
`),
block('social-circle','Friendships & Social Circles',`
The Unlikely Roommates|He and his roommate have almost nothing in common in music, food or sleep schedules. They became friends anyway after discovering a shared dislike of the same broken laundry machine.
The Friend from Home|His closest friend has known him since long before college. Their calls usually begin with football and move quickly to news he would never hear anywhere else.
The Study-Table Group|He found a dependable group of friends by sitting at the same study table repeatedly. Eventually someone asked whether he intended to introduce himself or simply claim the chair forever.
The Different Major|One of his closest friends knows very little about football. He enjoys conversations in which his athletic schedule is the least interesting thing to discuss.
The Reliable Pickup|He is the friend people call when a harmless plan falls apart and they need a ride. He does ask that the explanation wait until everyone has found their seat belt.
The Group Chat Archivist|He remembers old group-chat jokes at inconveniently precise moments. Friends are less impressed by this skill when their own messages are the evidence.
The Roommate Treaty|He and his roommate wrote informal rules for food, guests and quiet hours. The snack clause has required more renegotiation than all the others combined.
The Adopted Friend|An outgoing friend started inviting him to things without waiting for a polished answer. He was initially suspicious and is now grateful someone persisted.
The Lunch Table|He met a friend by asking whether a dining-hall seat was taken. They still argue about which of them was actually the one who started talking.
The Airport Favor|He once agreed to help a friend with an inconvenient early trip. The favor became the standard against which every future request for a ride has been measured.
The Opposite Taste|He and a close friend almost never agree on entertainment. Recommending something the other person might dislike has become a hobby of its own.
The Apartment Cook|Within his friend group, he is usually the person who offers to make something simple to eat. This has won him considerable popularity and very little help with the dishes.
The Quiet Check-In|He notices when a friend has gone quiet and sends an ordinary message rather than a dramatic one. Asking about dinner often opens a better conversation than demanding to know what is wrong.
The Card-Game Circle|A casual card game became a regular gathering among his friends. The rules have stayed mostly consistent, while the accusations of cheating remain entirely flexible.
The Newcomer's Seat|He remembers how awkward it felt to join an unfamiliar group. When someone new appears, he tries to offer a place before they have to ask.
The Shared Headphones|He and a friend once traded headphones to argue about a song. They now send each other music with increasingly detailed instructions about what deserves attention.
The Friendly Debate Club|His friends can turn almost any harmless preference into a debate. They have discussed everything from breakfast food to the proper temperature of a room with unreasonable seriousness.
The Roommate's Alarm|His roommate owns an alarm that appears to wake everyone except its owner. Their friendship has survived several attempts to negotiate a better system.
The No-Sports Friend|He values a friend who will ask about classes, family or a television show before mentioning football. It gives him somewhere to go when he wants to stop discussing the same subject.
The Road-Trip Seat|His friend group has unwritten rules about who sits where on a drive. He has opinions about the system but is not willing to volunteer for navigation to change it.
The Good-News Call|He has one friend he contacts first when something goes well. The reaction is so reliably enthusiastic that even small updates feel worth sharing.
The Peacekeeper's Snack|When a group disagreement becomes pointless, he sometimes suggests getting food. The method does not solve every problem, but it does improve the tone of the next conversation.
The Shared Collection|He and a friend exchange small souvenirs from places they visit. Most have little monetary value and extremely detailed explanations.
The Honest Friend|He has a friend who will tell him when an idea needs more thought. He does not always enjoy the answer immediately, which is part of why he trusts it.
The Standing Invitation|A friend's family has made it clear he is welcome at their table. He is still learning to accept the invitation without feeling he should arrive carrying something useful.
`),
block('academics-career','Academics & Career Goals',`
The Architecture Notebook|He is interested in architecture and keeps sketches of buildings he likes. His family now sends him pictures of unusually shaped houses as if they are homework.
The Future Teacher|He likes the idea of becoming a teacher after college. Helping younger relatives with schoolwork has given him a realistic appreciation for how much patience that job takes.
The Business Pitch|He carries around an idea for a small business and revises it whenever someone asks a practical question. At present, the presentation is further along than the financing.
The Biology Interest|He is drawn to biology because he likes understanding how living things work. Remembering the terminology is a different challenge from enjoying the subject.
The Sports-Law Question|He has become interested in the legal side of sports. Asking who actually reads all the paperwork led him toward a career possibility he had not considered before.
The First Office Hours|He was nervous about asking an instructor for help until a friend explained that office hours were meant for exactly that. He now tries not to wait until a small question becomes a large problem.
The Computer-Science Plan|He wants to learn enough programming to build something useful rather than merely follow a tutorial. So far, he has gained a project idea and considerable respect for error messages.
The Nursing Ambition|A relative's work in health care made him interested in nursing. He knows that liking the idea and managing the coursework are two different parts of the decision.
The History Elective|He chose a history class because the subject sounded interesting rather than because a friend recommended the timetable. He has started saving articles he would once have scrolled past.
The Group Project|He likes group projects better when someone agrees on responsibilities at the beginning. Discovering that nobody was responsible for the final slide taught him that preference.
The Accounting Surprise|He did not expect to enjoy the practical side of accounting. Seeing a messy set of expenses become understandable has turned out to be unexpectedly satisfying.
The Career-Center Visit|He went to a career-center event expecting little more than free snacks. He left with a useful contact and a better answer to the question of what might come after college.
The Environmental Interest|He is interested in work that connects the outdoors with environmental science. The ambition began with time spent outside long before he knew a career could involve studying it.
The Tutor Appointment|He would rather book time with a tutor than keep pretending a confusing topic will explain itself. Making the appointment early is the part he still has to remind himself to do.
The Presentation Practice|He rehearses class presentations in an empty room when he can find one. Having the first awkward version happen without an audience makes the real attempt less intimidating.
The Family Restaurant Plan|He would like to help run a family restaurant someday. He is paying more attention now to the business decisions behind the food he grew up enjoying.
The Internship Search|He is collecting ideas for an internship that could fit around his commitments. The search is teaching him how often a promising opportunity begins with sending one ordinary email.
The Undecided Answer|He has not settled on one career path and is getting better at saying so. Trying different subjects feels more useful than choosing an impressive answer for other people.
The Psychology Shelf|He is interested in psychology and keeps adding books he means to read. His friends have requested that he not treat their group chat as a case study.
The Engineering Curiosity|He likes taking things apart to understand them, even when reassembly takes longer. That habit has made engineering an appealing subject to explore.
The Better Notes|He discovered that neat notes and useful notes are not always the same thing. He is trying to write down explanations he will understand later rather than simply fill a page.
The Journalism Interest|He likes asking people how they ended up doing what they do. Journalism appeals to him because it could turn that curiosity into a real job.
experienced~The Difficult Exam|A college exam went badly enough to make him reconsider how he studied. He is trying a different preparation routine instead of assuming more hours automatically mean better understanding.
experienced~The Changed Direction|An early college class helped him realize one career path was not for him. He considers learning that before making a bigger commitment a useful result.
The Public-Service Goal|He is interested in work that would let him help his community directly. He is still learning which careers turn that broad intention into an actual daily job.
The Trade-School Respect|Several relatives work in skilled trades, and he takes their knowledge seriously. Whatever career he chooses, he wants it to involve being able to do something genuinely useful.
The Office Calendar|He keeps an academic calendar separate from everything football-related. Seeing assignments in one place makes it harder to accidentally treat a deadline as somebody else's reminder.
The Museum Stop|He likes visiting museums when time allows and rarely follows the suggested route. One interesting exhibit can take up the entire visit.
The Graduate-School Question|He is curious about eventually continuing his education beyond a first degree. For now, doing the current work well seems like the sensible place to begin.
The Family Graduation Photo|A family graduation picture sits among the things he brought from home. It reminds him that finishing his education is part of the reason he wanted this experience.
`),
block('money-lifestyle','Money & Lifestyle',`
The Written Budget|He keeps a simple budget and updates it before making a bigger purchase. Friends have learned that expensive and affordable are not the same word in his vocabulary.
The Sneaker Temptation|He can explain exactly why a new pair of shoes is not necessary. The explanation becomes less convincing whenever the pair goes on sale.
The Side-Hustle Photos|He takes casual photographs for friends who need something better than a phone selfie. The small jobs give him a creative outlet and a reason to keep learning his camera.
The Used-Car Fund|He is putting money aside for a dependable used car. His wish list gets more practical each time someone explains another cost of owning one.
The Family Advice|A relative taught him to wait a day before buying something expensive. He occasionally spends that day looking for arguments against the advice.
The Resale Research|He enjoys comparing resale prices even when he does not intend to buy anything. Friends now ask him whether their supposed bargain is actually a bargain.
The Barber Booking|He has helped friends arrange haircuts because he knows someone who does good work. He has considered whether being this organized for other people should count as a business.
The NIL Notebook|He writes down questions whenever he hears about an athlete's endorsement deal. He wants to understand the responsibilities before imagining what the money could buy.
The Free-Event Expert|He pays attention when a campus event includes free food or entertainment. Planning an enjoyable evening without spending much feels like beating a small puzzle.
The Shared Subscription|He and friends split a subscription and keep an unnecessarily careful account of who has paid. The argument is usually about remembering the password rather than the money.
The Repair First|He tries repairing something before replacing it. The policy has saved him money and occasionally left his desk covered with parts for several days.
The Savings Goal|He gives himself a modest savings target instead of promising a complete financial makeover. Meeting it consistently matters more than making the number sound impressive.
The Impulse Purchase|He bought an appealing gadget that became far less useful once the box was open. Keeping it nearby has become a reminder to read beyond the first enthusiastic review.
The Small Online Shop|He occasionally sells things he has made through a small online page. Packaging an order neatly takes more time than he expected when the idea began.
The Contract Questions|He attended a talk about athlete endorsement agreements and left with a long list of questions. The experience made him more interested in the fine print than the headline amount.
The Split Bill|He is comfortable suggesting a simple plan for splitting a group bill. Being clear early seems kinder than letting everyone argue about it afterward.
The Family Work Habit|He grew up helping with ordinary jobs around a family business. It left him with a practical respect for the work behind money that looks easy from a distance.
The Cheap Furniture Hunt|He likes finding useful secondhand furniture. Measuring whether it will fit through a doorway has become an important improvement to the process.
The Emergency Envelope|He tries to keep a little money aside for an uninteresting surprise. Needing to replace something ordinary taught him why that category deserves a place in a budget.
The Gift Planner|He shops for gifts early when he sees something that suits a person. Remembering where he stored the gift can become the expensive part of the plan.
The Local-Business Idea|He has ideas for how a small local business could work with an athlete someday. He wants any arrangement to be useful for the business rather than simply a photograph and a promise.
The Food Budget|He started paying closer attention to what takeout costs over a whole month. Learning a few dependable meals has become a financial decision as much as a cooking one.
The Car-Cleaning Kit|He occasionally helps friends clean their cars and takes the results seriously. What began as a favor has given him ideas for a small service business.
The Sale That Wasn't|He once bought something mostly because a sign said the discount would end that day. Discovering the same sign a week later has made him more suspicious of urgency as a sales pitch.
The Future Money Plan|He wants to know how to handle irregular income before he ever has much of it. His current plan begins with questions and a spreadsheet rather than an imagined endorsement announcement.
`),
block('online-reputation','Social Media & Reputation',`
performer~The Caption Workshop|He spends longer choosing a caption than taking the picture. His friends are tired of voting between three versions that say nearly the same thing.
The Private Account|He keeps his social account small and accepts requests carefully. Friends who want a public update on his life generally have to ask him directly.
The Accidental Clip|A friend posted a funny clip of him that traveled farther than anyone expected. He still gets messages about a moment he barely remembers happening.
performer~The Campus Food Page|He has started posting informal reviews of inexpensive places to eat. The audience is small, but friends now expect him to provide useful commentary before taking the first bite.
The Drafts Folder|He saves plenty of posts as drafts and publishes very few. Looking through the folder is like reading conversations he decided not to start.
The Comment-Section Exit|He once lost an evening to an argument that changed nobody's mind. He is getting better at closing the app before a similar discussion begins.
performer~The Photo Credit|He gives friends clear photo credit whenever they take a good picture of him. They are less sure whether the credit compensates for the number of retakes.
The Quiet Feed|He follows accounts that teach him something or make him laugh. His feed is more likely to contain cooking advice than an argument about his own sport.
The Old Username|He created a username as a kid that seemed much better at the time. Friends have made clear that changing it now will not erase the memory.
performer~The Running Series|He has an ongoing series of harmless jokes on his social page. A few friends follow the installments with much more attention than the production values deserve.
The Posting Delay|He prefers posting a picture after an outing instead of during it. Enjoying the event first seems easier than trying to narrate it while it happens.
The Family Audience|He remembered his family followed his account immediately after posting a joke that needed context. He has been more careful about captions ever since.
The Notification Cleanup|He turned off most notifications after realizing how often they interrupted an ordinary day. The apps are still there, but they have to wait until he opens them.
The Meme Librarian|He has a saved image for an unreasonable number of situations. Friends occasionally create a situation just to see whether he can find a suitable response.
performer~The Tiny Audience|He enjoys making short videos even when only a handful of friends watch. A good reaction from the right person matters more to him than a large number beside the post.
The Search Result|He occasionally searches his own name to see what people would find first. Most of the results are less interesting than the versions his friends invent.
The Group-Chat Screenshot|He asks before posting a screenshot from a private conversation. The rule became important after a harmless joke reached someone who had missed the beginning.
The Editing Hobby|He likes putting ordinary clips together into a watchable little video. Learning the editing tools has become more enjoyable than checking how many people watched.
The Old-Post Audit|He looked through some old posts and discovered several opinions he no longer wants to defend. Removing them felt easier than writing a public explanation of growing up.
performer~The Campus Interview|He agreed to answer a lighthearted student interview and gave one unusually quotable answer. His friends have made sure the clip will never be difficult to find.
The Unposted Win|He has become comfortable enjoying good news without immediately posting it. Telling the people involved sometimes feels like enough of an announcement.
The Misread Message|An ordinary message once sounded much harsher on a screen than he intended. He is quicker now to call when a conversation needs tone as well as words.
The Source Check|He likes checking a surprising claim before sending it to everyone he knows. Friends have learned that a dramatic headline may receive a much less dramatic follow-up.
The Silent Group Member|He reads far more group-chat messages than he answers. Friends know he is paying attention because he will mention an obscure detail much later.
The Pinned Reminder|He keeps a short personal reminder where he will see it before posting. It has persuaded him to leave several temporary feelings out of a permanent record.
`),
block('hidden-talents','Hobbies & Hidden Talents',`
The Game-Settings Tinkerer|He can spend an entire gaming session adjusting settings before starting a match. His friends would prefer an occasional demonstration that the game still works afterward.
The Piano Secret|He learned a few piano pieces when he was younger and still plays when he finds a keyboard. People who only know him through football are usually surprised by the hobby.
The Soup Specialist|He makes one dependable soup well enough that friends request it in advance. He guards the recipe even though most of it came from the side of a package.
The Sketch of a Friend|He likes drawing people from memory, with mixed results. Friends have strong opinions about whether his most recognizable portraits are also his most flattering.
The Old-Car Videos|He watches videos about restoring cars he does not own. He can explain several complicated repairs that he has not yet had an opportunity to attempt.
The Puzzle Table|He likes leaving a jigsaw puzzle on a table and returning to it a little at a time. Friends who claim not to enjoy puzzles still stop to fit in a few pieces.
The Beat Folder|He makes simple beats on his laptop and gives them unnecessarily dramatic working titles. His closest friends have heard versions numbered well into double digits.
The Bread Experiment|He became interested in making bread after discovering how much waiting is involved. A successful loaf feels like a reward for remembering a plan from several hours earlier.
The Miniature Builder|He enjoys putting small models together and painting the details. It is one hobby where he is happy to work slowly and leave the result alone afterward.
The Chess App|He plays short chess games on his phone and reviews losses more willingly than he admits. Friends know when he has lost because the next conversation often concerns one particularly frustrating knight.
The Thrift-Store Camera|He bought a secondhand camera mainly because it looked interesting. Learning what all the controls do has become a much longer project.
The Beginner Guitar|He knows a few guitar chords and keeps promising to learn the transition between them properly. Friends can identify his practice song from the other end of the hallway.
The Map Collector|He likes looking at old maps and comparing them with places he knows. A familiar street can turn into a long conversation about what used to be there.
The Backyard Gardener|He enjoys growing herbs or small plants whenever he has the space. Remembering to water them has become a useful test of how organized his week really is.
The Racing Setup|He has opinions about racing-game controls that far exceed his available setup. Friends have been informed that a better chair would obviously improve the whole experience.
The Animation Attempts|He makes short animations as a hobby and is learning how much work a few seconds can contain. A simple moving character now earns more respect from him than it once did.
The Card Trick|He knows one good card trick and tries not to use it too often on the same audience. This has made meeting new people unusually convenient for his hobby.
The Birdwatching App|He downloaded a bird-identification app on a whim and kept using it. Friends are still adjusting to having a conversation interrupted by an enthusiastic observation about a nearby tree.
The Chili Debate|He enjoys cooking chili and has opinions about several ingredients. He has learned that serving it to friends is an effective way to collect equally strong opposing opinions.
The Short-Story Folder|He writes little fictional scenes that he rarely shows anyone. Finishing one has proved much harder than coming up with a title for it.
The Vinyl Browsing|He enjoys looking through secondhand records even when he buys nothing. Asking about an unfamiliar cover has led him toward music he would never have searched for.
The Origami Break|He learned to fold a few paper shapes and does it when he wants a quiet break. Friends occasionally find a tiny paper animal waiting beside their things.
The Fantasy Map|He likes drawing maps for an imaginary place he has been inventing for years. Details keep changing whenever he thinks of a better reason for a town to exist.
The Repair Bench|He enjoys figuring out why a small household item stopped working. Fixing something inexpensive can make him happier than buying a more impressive replacement.
The Unusual Collection|He collects souvenir magnets and can explain the story behind nearly every one. People who want to give him something easy have learned that this information is very useful.
`),
block('growth','Personal Struggles & Growth',`
The Homesick Meal|He sometimes misses a meal from home more than any particular place. Learning to make a rough version of it has helped unfamiliar surroundings feel less distant.
The Better Apology|He is learning that explaining why he made a mistake is not the same as apologizing for it. A difficult conversation with a friend gave that lesson a practical meaning.
The Comparison Trap|He catches himself comparing his whole life with the best moments other people share. Remembering how carefully those moments are selected has helped him step back.
The Quiet Request|Asking for help used to feel like admitting he had failed at something. He is learning that getting useful support early usually leaves more options open.
The New Responsibility|Being away from home has made ordinary responsibilities feel more immediate. There is no mystery person who replaces the laundry detergent or remembers every appointment.
The Difficult Goodbye|Leaving a familiar routine was harder than he expected. Regular calls and a few dependable habits have helped him build a new one without pretending the adjustment was effortless.
The Kept Promise|He made a small promise to a friend and had to reorganize his day to keep it. Following through felt better than the convenient excuse he almost used.
The Confidence Practice|He is trying to stop dismissing a compliment before the person finishes giving it. Saying thanks has become a small confidence exercise of its own.
The Unsent Reaction|He once wrote an angry reply and waited before sending it. Reading it later convinced him that waiting can be a useful part of making a decision.
The Smaller Circle of Worry|He has started distinguishing a problem he can work on from a possibility he can only worry about. The difference does not solve everything, but it gives him a better starting point.
The New Routine at Home|A change in his family's routine made visits feel different for a while. He is learning that feeling at home can involve making new habits as well as keeping old ones.
The Honest Answer|He used to say he was fine whenever a conversation became uncomfortable. He is getting better at giving an honest answer to the people he trusts.
The Missed Reminder|Forgetting something important made him realize that good intentions were not a complete system. He has become much more willing to use reminders instead of relying on memory and apologies.
The Pause before Yes|He is learning to stop agreeing to every request immediately. A clear answer about what he can manage has proved kinder than an enthusiastic promise he cannot keep.
The Borrowed Perspective|A friend pointed out how harshly he described his own mistakes. He is trying to use the same patience for himself that he would offer somebody else.
The Fresh Start on a Tuesday|He stopped waiting for a new month or a perfect Monday to change a habit. An ordinary day turned out to be a perfectly reasonable time to begin.
The Less Dramatic Setback|A disappointing personal project once felt like proof that the whole idea was foolish. Looking at it later helped him separate a failed attempt from a permanent conclusion.
The Useful Conversation|He has a trusted person he calls when he needs to talk something through. The conversation works best when he stops pretending he already knows the answer.
The Better Boundary|He is learning that keeping a personal boundary does not require starting an argument. Sometimes a calm no is the clearest answer he can give.
The Homecoming Difference|Returning home after time away showed him that he had changed in small ways. He is still working out which changes he wants to keep and which were simply part of adjusting.
`),
block('campus-antics','Campus Stories & Antics',`
The Wrong Lecture|He once sat through the beginning of the wrong campus talk because leaving felt more embarrassing than staying. Friends argue that his commitment to the mistake was the most impressive part.
The Mascot Photograph|He asked for a picture with a costumed mascot and somehow looked more startled than the person inside it. His friends consider the result far better than a normal photograph would have been.
The Laundry Surprise|A forgotten bright sock turned a load of light laundry into an unexpected experiment. He now understands that a small item can have an unreasonable amount of influence.
The Takeout Name|He gave a joking name for a takeout order and immediately forgot to listen for it. The announcement became much funnier once his friends realized why his food was getting cold.
The Quiet-Zone Whisper|He tried to whisper a joke in a quiet area and discovered he is not good at estimating volume. Friends continue to request his definition of a whisper before entering libraries.
The Cardboard Guest|A harmless cardboard figure appeared in a friend's room and began moving around the group. Nobody admits to organizing its increasingly elaborate appearances.
The Stuck Drawer|He spent several minutes trying to fix a drawer that would not open. His roommate eventually pointed out the bag leaning against it.
The Accidental Tour|A visitor once mistook him for someone helping with a campus tour. He provided directions confidently enough that he later felt obliged to check whether they were correct.
The Vending-Machine Negotiation|A snack got stuck just long enough for several friends to become invested in the problem. The eventual arrival of a second customer turned the whole effort into a small public discussion.
The Birthday Banner|He helped hang a birthday banner and noticed too late that two letters had traded places. Correcting it became less popular once everyone had taken a picture.
The Unhelpful Printer|He once thought a printer was broken when he had simply sent the job somewhere else. Finding the stack of repeated attempts required a much longer walk than expected.
The Costume in Daylight|He agreed to wear a harmless costume to an evening event and forgot he had an earlier errand. A short trip across campus became a longer series of conversations.
The Group-Photo Timer|He trusted a camera timer and arrived in the picture halfway through sitting down. The group has refused to replace that version with a more dignified one.
The Room-Key Lesson|He once returned to his room carrying everything except the key needed to enter it. Friends have made the event part of their standard packing advice.
The Suspicious Squeak|A chair began making a noise so ridiculous that nobody could take the conversation seriously. He initially tried to explain that the noise was not his fault, which only made things worse.
The Too-Large Food Order|He misunderstood a menu quantity and ordered enough food for several additional people. The mistake turned into an unexpectedly successful gathering.
The Silent Dance Battle|Friends recorded him dancing with headphones on, without the music that made the movements sensible. He has requested that future screenings include the soundtrack.
The Decorative Duck|A tiny plastic duck appeared among a friend's belongings and started a harmless exchange of hiding places. He now checks a few unlikely spots before assuming he has finally seen the last one.
The Elevator Conversation|He delivered an enthusiastic story before realizing the elevator had reached his floor. He had to choose between finishing it for strangers or explaining why he was riding back up.
The Chalk Message|He helped write a cheerful message on an approved campus chalkboard. The handwriting attracted more comments than the message itself.
The Lost Water Bottle|He described a missing water bottle in great detail while carrying it. His friends have treated every later search request as an opportunity to revisit the investigation.
The Wrong Group Chat|He sent a harmless message to the wrong group and recognized the mistake only after the replies began. Explaining the missing context took longer than writing the original message.
The Impressive Knot|He tied a bag shut so thoroughly that reopening it became a group project. Friends now ask whether he wants the contents protected or merely accessible.
The Picnic Forecast|He proposed eating outside just before a brief shower arrived. His friends remain willing to follow his food recommendations but prefer to check the weather independently.
The Accidental Wave|He enthusiastically returned a wave intended for somebody behind him. Carrying on as if he had meant to greet everyone seemed like the least awkward option available.
`),
block('values','Beliefs, Values & Motivations',`
The Kept Word|He takes a promise seriously even when the task attached to it seems small. He would rather give a realistic answer at the beginning than make somebody chase an explanation later.
The Independent Answer|He likes hearing advice but wants the final decision to feel like his own. Taking responsibility for a choice seems easier than blaming someone else's recommendation afterward.
The Loyalty Test|He values friends who remain consistent when there is nothing interesting happening. Ordinary days tell him more about a friendship than a public declaration does.
The Family Principle|A family member taught him to leave a place a little better than he found it. He tries to apply the idea in practical ways rather than turn it into a slogan.
The Quiet Ambition|He has goals he does not feel obliged to announce to everyone. Keeping some plans private lets him concentrate on making them real instead of defending them early.
The Fair Deal|He dislikes an arrangement that works only because somebody did not understand the terms. Being clear about expectations matters to him even when a vague agreement would be more convenient.
The Credit Where Due|He believes people should hear when their work helped someone else. Giving credit feels like basic accuracy rather than an elaborate gesture.
The Room to Change|He wants people to be allowed to learn from an ordinary mistake. He tries to remember that principle when deciding how long to keep teasing a friend about one.
The Community Connection|He likes the idea of eventually doing something useful for the place that helped raise him. The plan is still broad, but the people behind it are very specific to him.
The Earned Confidence|He trusts confidence more when it comes with preparation. It is a principle he finds easier to admire in others than consistently practice himself.
The Honest Limit|He would rather admit what he cannot do than let someone plan around an empty promise. Knowing his limits has become part of how he tries to be dependable.
The Curiosity Rule|He tries to ask one genuine question before deciding he understands a person. The habit has led to better conversations than his first impressions sometimes deserved.
The Shared Opportunity|He remembers people who made an opportunity easier for him to reach. When he can return a practical favor, he prefers doing that to making a speech about gratitude.
The Personal Definition|He is working out what a successful life would look like if nobody else were grading it. The answer includes more ordinary things than he expected when he first asked himself.
The Long Memory for Kindness|He remembers a small kindness from years ago in remarkable detail. It makes him suspect that ordinary help can matter longer than the person offering it realizes.
`)
]);
export const EXTRA_BACKSTORIES=Object.freeze(EXPANSION_GROUPS.flatMap(group=>group.stories.map((story,index)=>Object.freeze({id:`${group.id}-${String(index+1).padStart(2,'0')}`,category:group.category,...story}))));
