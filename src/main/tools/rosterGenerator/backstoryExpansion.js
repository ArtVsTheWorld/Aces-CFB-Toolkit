// New non-football stories use fictional personal details, not fabricated
// performance records, recruiting rankings, eligibility or real NIL contracts.
const block=(id,category,text)=>({id,category,stories:text.trim().split('\n').map(line=>{const [heading,...body]=line.split('|'),parts=heading.split('~');return {rule:parts.length===2?parts[0]:'any',title:parts.at(-1),text:body.join('|')};})});
export const EXPANSION_GROUPS=Object.freeze([
block('off-field','Off the Field',`
performer~The Last Song|He keeps volunteering to control the locker-room music and then ignoring requests. Teammates have begun pretending the speaker is broken when he arrives.
The Open Door|He props his football locker open during conversations and complains when people borrow things. He has rejected every suggestion linking those two habits.
The Couch Reservation|He likes watching football from the same battered couch at a teammate's apartment. He claims the good cushion despite contributing nothing toward the couch.
performer~Team Nightlife Correspondent|He knows which teammate will get a laugh at a team gathering and introduces them like a ring announcer. The introductions are becoming more insulting than the actual jokes.
The Sunrise Walker|He enjoys the empty walk to early football commitments less than the silence it gives him. He takes a longer route if he spots someone unusually talkative.
The Dining-Hall Table|He has a preferred dining-hall seat beside teammates who will argue football with him. He becomes mysteriously quiet when someone remembers his worst prediction.
The Practice Spectator|He people-watches during gaps in football activities and invents private nicknames. His closest friend has demanded a written guarantee that he is exempt.
performer~One More Invitation|He volunteers the football group for events before checking whether anyone wants to go. Teammates now require a second signature on his social plans.
The Homebody's Excuse|He blamed football commitments for missing a gathering when he really wanted to stay on the couch. The excuse failed when three teammates appeared in the same photograph from the gathering.
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
performer~The Best-Dressed Claim|He rates his teammates' football-arrival outfits without being asked. He considers his own wardrobe exempt because the judge cannot enter the competition.
performer~The Self-Appointed Expert|He calls himself a football historian after watching a handful of old highlights. Teammates keep asking him about games they made up.
performer~The Entrance|He walks into football meetings with the timing of somebody expecting applause. His position coach has begun welcoming him with deliberately awkward silence.
performer~The Victory Speech|He delivers mock victory speeches after winning minor football-room arguments. Teammates deliver equally elaborate corrections when his evidence turns out to be wrong.
performer~The Friendly Rivalry|He turns a walk to football activities into a competition without warning anybody. He then complains that nobody is giving him proper credit for winning.
performer~The Outfit Consultation|He makes teammates vote on his team-travel outfit and ignores the result. His friends call the process a survey of people he intends to disappoint.
performer~The Main Character|He describes routine football meetings as scenes from a documentary about himself. Teammates object mainly to the quality of the roles he assigns them.
performer~The Loud Prediction|He predicts the result of every informal football challenge with complete confidence. A teammate has started keeping score of the predictions rather than the contests.
unpredictable~The Bad Idea Committee|He persuaded teammates to conduct a mock press conference about a missing football glove. The owner was not amused to discover he was the leading suspect.
unpredictable~The Dramatic Apology|He apologized for eating a teammate's post-practice meal with a handwritten statement. The statement blamed poor refrigerator communication and made everything worse.
team-first~The Credit Redirect|He thanked a football teammate publicly for a favor and accidentally revealed an embarrassing detail. He still owes that teammate a second, much quieter thank-you.
team-first~The Quiet Favor|He leaves spare football supplies for teammates who run out but hates being called the team parent. A package of cartoon reward stickers tested his patience.
team-first~The Extra Seat|He makes room for newcomers at football dinners even when the table is already crowded. He is less welcoming about sharing the fries he ordered.
team-first~The Last Slice|He asks teammates whether they want the last slice after football activities and hopes everyone says no. His face has become a reliable clue to the real question.
team-first~The Good Listener|Teammates bring him football complaints because he usually lets them finish. He has had to establish that listening does not include taking sides.
team-first~The Small Thank-You|He thanks the football support staff by name and occasionally gets a name wrong. The staff have begun returning the favor with increasingly creative versions of his.
team-first~The Borrowed Charger|He lends teammates a charger during football meetings and never knows where it ends up. He recently attached a label large enough to count as a flag.
team-first~The Cleanup Crew|He stays to help clean after team gatherings but complains the entire time. Teammates recognize the difference between the performance and the actual willingness to help.
team-first~The Shared Win|He celebrates teammates' small football successes with genuine enthusiasm. He still gets irritated when somebody else receives more attention for the same thing.
team-first~The Unrequested Backup|He brings extra football supplies for nervous newcomers without making a big announcement. He is much less prepared when the forgotten item belongs to him.
reserved~The Warm-Up Conversation|He needs a few minutes before joining locker-room banter. His teammates have learned that the quiet opening usually precedes a devastating imitation.
reserved~The Soft Voice|He speaks quietly enough that football teammates regularly miss his punch lines. He dislikes repeating them and has started charging imaginary replay fees.
reserved~The Written Reply|He can describe a football disagreement clearly by text and stumble over the same words in person. He has considered sending messages while standing beside the intended recipient.
reserved~The Small Circle|He prefers sitting with the same two teammates at football gatherings. One of them is far more outgoing, which keeps ruining his plan for a quiet evening.
reserved~The Observation First|He can sit through a noisy football-room argument without saying anything. His eventual contribution usually reveals that both sides forgot an embarrassing detail.
reserved~The Surprise Joke|He rarely joins the loudest locker-room conversation until he has something good. Teammates have learned not to mistake a long silence for innocence.
reserved~The Practice Introduction|He rehearses greetings before meeting people through football. He recently prepared for a formal introduction to someone who opened by asking about his shoes.
reserved~The Quiet Celebration|He celebrates good football news with a private meal rather than a post. His closest teammates are offended that learning about it requires detective work.
reserved~The Thoughtful Pause|He takes long enough to answer football questions that teammates sometimes answer for him. He has asked them to stop helping quite so efficiently.
reserved~The Familiar Faces|He is quiet around unfamiliar football staff and completely different around his teammates. A coach once overheard the louder version and asked whether he had a twin.
driven~The Five-Minute Rule|He arrives early for football commitments and judges teammates who cut it close. He was late once and has spent considerable effort defining the exception.
driven~The Serious Planner|He schedules informal football work with the precision of a military operation. Teammates keep asking where the nap break appears on the chart.
driven~The Unfinished Task|He cannot stop discussing a disputed football rep until someone agrees with him. Friends now announce agreement before he finishes the explanation.
driven~The Direct Answer|He gives blunt football feedback when teammates ask and dislikes receiving equally blunt feedback about himself. A coach has pointed this out without softening the wording.
driven~The Personal Deadline|He sets early deadlines for football preparation and gets annoyed when others do not adopt them. His roommate has explained that private deadlines do not create public emergencies.
driven~The Competitive Board Game|He reads board-game rules like a football call sheet and studies loopholes. Teammates now require a rules meeting before allowing him to host.
unpredictable~The Goofy Voice|He reads football reminders aloud in a different voice for every coach. He once forgot to change back when the real coach entered.
unpredictable~The Impulse Hobby|He briefly decided every football teammate needed a homemade pregame bracelet. The group received three bracelets and a long explanation about supply costs.
unpredictable~The Unnecessary Costume|He arrived at an informal team gathering in an outfit nobody else interpreted as casual. His defense involved a football metaphor that clarified nothing.
unpredictable~The Running Bit|He repeats a harmless locker-room joke until it becomes funny through sheer persistence. Teammates fear the day a coach accidentally encourages a sequel.
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
The Unlikely Roommates|He and a football teammate disagree about food, music and acceptable alarm volume. Their friendship survives because both dislike the same cafeteria soup.
The Friend from Home|His oldest friend still calls him by a ridiculous youth-football nickname. He answers immediately and then threatens to stop answering.
The Study-Table Group|A teammate invited him to a football-group study session that became an argument over snacks. They now bring separate snacks and still argue.
The Different Major|He has a friend outside football who cannot remember his position. He likes the arrangement until the friend introduces him as some sort of goalkeeper.
The Reliable Pickup|He gives teammates rides after football commitments and bans criticism of his music. The ban has not reduced the criticism, only increased its creativity.
The Group-Chat Archivist|He saves locker-room group-chat messages for future arguments. Teammates consider him trustworthy with real secrets and dangerous with minor football predictions.
The Roommate Treaty|He and a teammate wrote rules about sharing post-practice food. A handwritten amendment defining leftovers has become the apartment's most contested document.
The Adopted Friend|An outgoing teammate kept inviting him to football dinners despite receiving vague answers. He finally attended to ask why the invitations had become so persistent.
The Lunch Table|He befriended a teammate after arguing about an empty dining-hall seat. They still introduce each other as the person who cannot recognize a reserved chair.
The Airport Favor|He drove a football teammate to an absurdly early flight and has never stopped mentioning it. The teammate considers paying for breakfast a completed transaction.
The Opposite Taste|He and his closest football friend disagree on almost every film and album. They recommend things mainly to annoy each other.
The Apartment Cook|He cooks for football teammates and pretends not to mind doing the dishes. The growing list taped above the sink suggests otherwise.
The Quiet Check-In|He asks quiet teammates to get food instead of demanding an explanation in the locker room. He is better at starting that conversation than knowing how to end it.
The Card-Game Circle|Teammates meet for cards after football work and accuse him of cheating whenever he wins. He considers the accusations a compliment until he actually loses.
The Newcomer's Seat|He invites new football players into conversations before they have to hover awkwardly nearby. He still remembers which teammates let him hover.
The Shared Headphones|He traded warmup playlists with a football teammate and hated almost every song. They now send each other increasingly hostile music recommendations.
The Friendly Debate Club|His football friends hold serious debates over deeply unimportant subjects. He remains furious about losing their vote on the best gas-station snack.
The Roommate's Alarm|A teammate's early football alarm wakes everyone in their apartment except its owner. He has begun placing the phone beside the owner's pillow with theatrical care.
The No-Football Friend|He has one friend who refuses to discuss football until they have talked about something else. He pretends to resent this and keeps making the calls.
The Road-Trip Seat|His football friend group has elaborate rules about car seats and navigation duties. He argues for the passenger seat while demonstrating no navigational ability.
The Good-News Call|He calls an old football teammate first whenever something goes well. He sometimes has to interrupt several minutes of unrelated complaints before giving the actual news.
The Peacekeeper's Snack|He interrupts pointless locker-room arguments by suggesting food. Teammates have noticed he usually makes the suggestion when somebody else offers to pay.
The Shared Collection|He and an old football friend exchange the ugliest souvenirs they can find. Their collection is now too sentimental to throw away and too embarrassing to display.
The Honest Friend|He trusts one teammate to tell him when his football confidence becomes obnoxious. He trusts that teammate somewhat less during the conversation itself.
The Standing Invitation|A football teammate's family keeps a seat for him at dinner. He brings something to contribute and regularly chooses a dessert nobody wants.
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
The Homesick Meal|He called home to ask for a recipe and discovered nobody had ever measured the ingredients. His first attempt tasted wrong enough to make him miss home more.
The Better Apology|He apologized to a friend and spent most of the conversation defending himself. The friend made him start again without the speech.
The Comparison Trap|He scrolls through other people's good weekends while sitting in an untidy room. He has not yet decided whether deleting the app would be growth or surrender.
The Quiet Request|He let a small personal problem become expensive because asking for help embarrassed him. He is still paying it off and still dislikes telling the story.
The New Responsibility|He ran out of clean clothes and learned that detergent does not appear through family magic. He bought the largest bottle in the store out of irritation.
The Difficult Goodbye|He was louder than everyone else about being ready to leave home. He called back before the first evening was over.
The Kept Promise|He nearly canceled helping a friend move because the day looked unpleasant. He went anyway and complained enough to make the friend question the benefit.
The Confidence Practice|He deflects compliments with jokes until people stop trying. He is beginning to suspect that this is not the confidence he thinks it is.
The Unsent Reaction|He wrote a furious message and sent a screenshot to a friend for approval. The friend replied with a picture of a trash can.
The Circle of Worry|He can turn one uncertain plan into an entire evening of imagined disasters. His roommate sometimes interrupts by asking him to identify the problem that has actually happened.
The New Routine at Home|His old bedroom became a storage room after he left for college. He acts offended but mostly wants his family to stop stacking boxes on the bed.
The Honest Answer|He tells people he is fine with a tone that makes the opposite obvious. One friend has stopped accepting that answer without ordering food first.
The Missed Reminder|He forgot an important birthday despite having three reminders on his phone. His eventual apology required listening to the explanation of how reminders work.
The Pause Before Yes|He agrees to favors because saying no feels awkward, then resents the entire afternoon. He is practicing shorter answers that do not require invented emergencies.
The Borrowed Perspective|He repeated a harsh judgment about himself and watched a friend become genuinely angry. He had not realized how often he said it out loud.
The Tuesday Start|He announced an elaborate fresh start for the following Monday. His roommate asked why cleaning the desk required another five days.
The Failed Project|He quit a hobby after the first result looked bad and kept the unfinished work in a drawer. He occasionally takes it out to argue with his own decision.
The Useful Conversation|He has a trusted relative who can tell when a phone call is really about something else. He usually spends ten minutes discussing the weather first.
The Better Boundary|He told a friend he needed space and then checked his phone constantly. He is learning that setting a boundary does not make waiting comfortable.
The Homecoming Difference|He returned home expecting everything to feel exactly the same. His younger sibling had claimed his favorite chair and showed no interest in symbolism.
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
The Kept Word|He remembers broken promises longer than he admits. Friends are careful about saying definitely when making plans with him.
The Independent Answer|He asks five people for advice and usually does what he planned anyway. He calls this research; his friends have a less generous name.
The Loyalty Test|He is loyal enough to defend a friend publicly even when the friend is plainly wrong. The private conversation afterward is considerably less supportive.
The Family Principle|His grandmother insists that visitors leave a house cleaner than they found it. He follows that rule at her house with an enthusiasm that disappears in his own room.
The Quiet Ambition|He has a specific long-term goal he refuses to share. His friends have stopped guessing because he enjoys saying no too much.
The Fair Deal|He hates being taken advantage of over small amounts of money. He will spend an hour recovering a sum smaller than the lunch he forgot to buy.
The Credit Where Due|He remembers who helped with a project and gets irritated when louder people take the credit. He is not always subtle about correcting them.
The Room to Change|He wants people to forget his old mistakes and keeps excellent records of theirs. A friend has asked him to pick one consistent policy.
The Community Connection|He wants to go home someday with enough money to improve something practical. His current plan begins with fixing the basketball hoop nobody in the neighborhood will replace.
The Earned Confidence|He mistrusts people who announce their own importance. His friends enjoy quoting this opinion whenever he begins doing exactly that.
The Honest Limit|He will admit he cannot do a job but hates admitting he never tried. This has led him into several household repairs of questionable quality.
The Curiosity Rule|He asks strangers unusually specific questions about their work. He recently learned far more about commercial refrigeration than the conversation required.
The Shared Opportunity|He remembers the person who helped him find his first useful summer job. He still answers that person's requests before reading the rest of the message.
The Personal Definition|His idea of success includes a quiet house, a reliable car and nobody telling him when to wake up. Friends point out that he already sleeps through instructions.
The Long Memory|He remembers an embarrassing favor someone did for him years ago. He repays it whenever he can and refuses to explain the details.
`)
]);
export const EXTRA_BACKSTORIES=Object.freeze(EXPANSION_GROUPS.flatMap(group=>group.stories.map((story,index)=>Object.freeze({id:`${group.id}-${String(index+1).padStart(2,'0')}`,category:group.category,...story}))));
